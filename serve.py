import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import subprocess
import tempfile
import threading
import uuid
from datetime import datetime
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from maturity_config import enrich_report, load_maturity_config


ROOT = Path(__file__).resolve().parent
REPORTS = ROOT / 'Rapports'
PRIVATE = ROOT / '.private'
USERS_FILE = PRIVATE / 'users.json'
PORT = int(os.environ.get('COMPANY_MATURITY_PORT', '8765'))
MAX_REQUEST_BYTES = 5 * 1024 * 1024
PASSWORD_ITERATIONS = 310_000
SESSIONS = {}
LOCK = threading.RLock()
MATURITY_CONFIG = load_maturity_config()


def find_browser():
    candidates = [
        shutil.which('msedge'),
        shutil.which('chrome'),
        Path(os.environ.get('PROGRAMFILES(X86)', '')) / 'Microsoft/Edge/Application/msedge.exe',
        Path(os.environ.get('PROGRAMFILES', '')) / 'Microsoft/Edge/Application/msedge.exe',
        Path(os.environ.get('LOCALAPPDATA', '')) / 'Google/Chrome/Application/chrome.exe',
    ]
    return next((str(path) for path in candidates if path and Path(path).is_file()), None)


def password_record(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, PASSWORD_ITERATIONS)
    return {'salt': salt.hex(), 'passwordHash': digest.hex()}


def load_users():
    PRIVATE.mkdir(exist_ok=True)
    if not USERS_FILE.exists():
        USERS_FILE.write_text(json.dumps({
            'admin': {**password_record('admin'), 'admin': True, 'createdAt': datetime.now().astimezone().isoformat()}
        }, indent=2), encoding='utf-8')
    return json.loads(USERS_FILE.read_text(encoding='utf-8'))


def save_users(users):
    temporary_file = USERS_FILE.with_suffix('.tmp')
    temporary_file.write_text(json.dumps(users, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary_file.replace(USERS_FILE)


USERS = load_users()


def verify_password(user, password):
    digest = hashlib.pbkdf2_hmac(
        'sha256', password.encode('utf-8'), bytes.fromhex(user['salt']), PASSWORD_ITERATIONS
    ).hex()
    return hmac.compare_digest(digest, user['passwordHash'])


def report_record(report_id):
    for path in REPORTS.glob('Rapport_Maturite_IA_*.json') if REPORTS.exists() else ():
        try:
            report = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            continue
        if str(report.get('id')) == report_id:
            return path, report
    return None, None


class ReportHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def _send_json(self, status, payload, extra_headers=()):
        data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        for name, value in extra_headers:
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(data)

    def _body(self):
        content_length = int(self.headers.get('Content-Length', '0'))
        if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
            raise ValueError('La taille de la requête est invalide.')
        return json.loads(self.rfile.read(content_length))

    def _current_user(self):
        cookie_header = self.headers.get('Cookie', '')
        parsed = cookies.SimpleCookie()
        try:
            parsed.load(cookie_header)
        except cookies.CookieError:
            return None
        session = parsed.get('session')
        username = SESSIONS.get(session.value) if session else None
        return {'username': username, **USERS[username]} if username in USERS else None

    def _require_user(self):
        user = self._current_user()
        if not user:
            self._send_json(401, {'error': 'Veuillez vous connecter.'})
            return None
        return user

    def _authorized_report(self, report_id, user):
        path, report = report_record(report_id)
        if not report or (not user.get('admin') and report.get('owner') != user['username']):
            self._send_json(404, {'error': 'Rapport introuvable.'})
            return None, None
        return path, report

    def do_GET(self):
        parsed_url = urlparse(self.path)
        route = parsed_url.path
        user = self._current_user()

        if route == '/':
            self.send_response(303)
            self.send_header('Location', '/index.html')
            self.end_headers()
            return

        if route == '/api/analysis-config':
            self._send_json(200, MATURITY_CONFIG)
            return

        if route == '/api/session':
            if not user:
                self._send_json(401, {'error': 'Session absente.'})
            else:
                self._send_json(200, {'username': user['username'], 'admin': user.get('admin', False)})
            return

        if route.startswith('/api/'):
            if route == '/api/reports':
                user = self._require_user()
                if not user:
                    return
                reports_by_id = {}
                for report_path in REPORTS.glob('Rapport_Maturite_IA_*.json') if REPORTS.exists() else ():
                    try:
                        report = json.loads(report_path.read_text(encoding='utf-8'))
                    except (OSError, json.JSONDecodeError):
                        continue
                    if user.get('admin') or report.get('owner') == user['username']:
                        item = {
                            'id': report.get('id'),
                            'savedAt': report.get('savedAt'),
                            'overall': report.get('overall'),
                            'owner': report.get('owner'),
                        }
                        existing = reports_by_id.get(item['id'])
                        if not existing or (item.get('savedAt') or '') > (existing.get('savedAt') or ''):
                            reports_by_id[item['id']] = item
                reports = list(reports_by_id.values())
                reports.sort(key=lambda item: item.get('savedAt') or '', reverse=True)
                self._send_json(200, {'reports': reports})
                return

            if route == '/api/report':
                user = self._require_user()
                if not user:
                    return
                report_id = parse_qs(parsed_url.query).get('id', [''])[0]
                if not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', report_id):
                    self._send_json(404, {'error': 'Rapport introuvable.'})
                    return
                _, report = self._authorized_report(report_id, user)
                if report:
                    if not report.get('analysisVersion'):
                        try:
                            report = enrich_report(report, MATURITY_CONFIG)
                        except ValueError:
                            pass
                    self._send_json(200, {'report': report})
                return

            if route == '/api/report-file':
                user = self._require_user()
                if not user:
                    return
                query = parse_qs(parsed_url.query)
                report_id = query.get('id', [''])[0]
                file_format = query.get('format', [''])[0]
                _, report = self._authorized_report(report_id, user)
                if not report:
                    return
                filename = report.get('files', {}).get(file_format)
                if file_format not in {'html', 'json', 'pdf'} or not filename or Path(filename).name != filename:
                    self._send_json(404, {'error': 'Fichier introuvable.'})
                    return
                file_path = REPORTS / filename
                if not file_path.is_file():
                    self._send_json(404, {'error': 'Fichier introuvable.'})
                    return
                content_types = {'html': 'text/html; charset=utf-8', 'json': 'application/json', 'pdf': 'application/pdf'}
                data = file_path.read_bytes()
                self.send_response(200)
                self.send_header('Content-Type', content_types[file_format])
                self.send_header('Content-Length', str(len(data)))
                self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
                self.end_headers()
                self.wfile.write(data)
                return

            if route == '/api/users':
                user = self._require_user()
                if not user:
                    return
                if not user.get('admin'):
                    self._send_json(403, {'error': 'Accès réservé à l’administrateur.'})
                    return
                self._send_json(200, {'users': [
                    {'username': name, 'admin': record.get('admin', False), 'createdAt': record.get('createdAt')}
                    for name, record in USERS.items()
                ]})
                return

            self._send_json(404, {'error': 'Route introuvable.'})
            return

        static_path = Path(self.translate_path(self.path)).resolve()
        private_path = PRIVATE.resolve()
        reports_path = REPORTS.resolve()
        data_path = (ROOT / 'Data').resolve()
        if private_path == static_path or private_path in static_path.parents:
            self.send_error(404)
            return
        if static_path == (ROOT / 'login.html').resolve() and user:
            self.send_response(303)
            self.send_header('Location', '/espace.html')
            self.end_headers()
            return
        protected_pages = {
            (ROOT / 'espace.html').resolve(),
            (ROOT / 'resultatsIA.html').resolve(),
        }
        if static_path in protected_pages and not user:
            self.send_response(303)
            self.send_header('Location', '/login.html')
            self.end_headers()
            return
        if reports_path == static_path or reports_path in static_path.parents:
            if not user or not user.get('admin'):
                self.send_error(404)
                return
        if data_path in static_path.parents and static_path.suffix.lower() == '.html':
            if not user or not user.get('admin'):
                self.send_error(404)
                return
        super().do_GET()

    def do_POST(self):
        route = urlparse(self.path).path
        try:
            payload = self._body()
            if route == '/api/login':
                username = payload.get('username', '').strip()
                password = payload.get('password', '')
                user = USERS.get(username)
                if not user or not isinstance(password, str) or not verify_password(user, password):
                    self._send_json(401, {'error': 'Identifiant ou mot de passe incorrect.'})
                    return
                session_id = secrets.token_urlsafe(32)
                SESSIONS[session_id] = username
                self._send_json(200, {'username': username, 'admin': user.get('admin', False)}, [
                    ('Set-Cookie', f'session={session_id}; HttpOnly; SameSite=Strict; Path=/')
                ])
                return

            if route == '/api/register':
                username = payload.get('username', '')
                password = payload.get('password', '')
                if not isinstance(username, str) or not re.fullmatch(r'[A-Za-z0-9_.-]{3,32}', username):
                    raise ValueError('Le login doit contenir de 3 à 32 caractères (lettres, chiffres, . _ -).')
                if not isinstance(password, str) or len(password) < 8:
                    raise ValueError('Le mot de passe doit contenir au moins 8 caractères.')
                with LOCK:
                    if username in USERS:
                        raise ValueError('Ce login existe déjà. Choisissez un autre login ou connectez-vous.')
                    USERS[username] = {
                        **password_record(password),
                        'admin': False,
                        'createdAt': datetime.now().astimezone().isoformat(timespec='seconds'),
                    }
                    save_users(USERS)
                    session_id = secrets.token_urlsafe(32)
                    SESSIONS[session_id] = username
                self._send_json(201, {'username': username, 'admin': False}, [
                    ('Set-Cookie', f'session={session_id}; HttpOnly; SameSite=Strict; Path=/')
                ])
                return

            if route == '/api/logout':
                cookie_header = self.headers.get('Cookie', '')
                parsed = cookies.SimpleCookie()
                try:
                    parsed.load(cookie_header)
                except cookies.CookieError:
                    pass
                session = parsed.get('session')
                if session:
                    SESSIONS.pop(session.value, None)
                self._send_json(200, {'ok': True}, [
                    ('Set-Cookie', 'session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
                ])
                return

            user = self._require_user()
            if not user:
                return

            if route == '/api/users':
                if not user.get('admin'):
                    self._send_json(403, {'error': 'Accès réservé à l’administrateur.'})
                    return
                username = payload.get('username', '').strip()
                password = payload.get('password', '')
                if not re.fullmatch(r'[A-Za-z0-9_.-]{3,32}', username):
                    raise ValueError('Le login doit contenir de 3 à 32 caractères (lettres, chiffres, . _ -).')
                if not isinstance(password, str) or len(password) < 8:
                    raise ValueError('Le mot de passe doit contenir au moins 8 caractères.')
                with LOCK:
                    if username in USERS:
                        raise ValueError('Ce login existe déjà.')
                    USERS[username] = {
                        **password_record(password),
                        'admin': False,
                        'createdAt': datetime.now().astimezone().isoformat(timespec='seconds'),
                    }
                    save_users(USERS)
                self._send_json(201, {'username': username})
                return

            if route == '/api/password':
                old_password = payload.get('oldPassword', '')
                new_password = payload.get('newPassword', '')
                if not isinstance(old_password, str) or not verify_password(user, old_password):
                    self._send_json(400, {'error': 'Le mot de passe actuel est incorrect.'})
                    return
                if not isinstance(new_password, str) or len(new_password) < 8:
                    raise ValueError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
                with LOCK:
                    USERS[user['username']].update(password_record(new_password))
                    save_users(USERS)
                self._send_json(200, {'ok': True})
                return

            if route == '/api/save-report':
                report = payload.get('report')
                html = payload.get('html')
                if not isinstance(report, dict):
                    raise ValueError('Les résultats du formulaire sont manquants.')
                report = enrich_report(report, MATURITY_CONFIG)
                if html is not None and (not isinstance(html, str) or '<html' not in html.lower()):
                    raise ValueError('Le rapport HTML est invalide.')

                REPORTS.mkdir(exist_ok=True)
                report_id = report.get('id')
                report_path = None
                stored_report = None
                if report_id:
                    report_path, stored_report = report_record(str(report_id))
                    if not stored_report or (not user.get('admin') and stored_report.get('owner') != user['username']):
                        self._send_json(404, {'error': 'Rapport introuvable.'})
                        return
                    if stored_report.get('owner') != user['username'] and not user.get('admin'):
                        self._send_json(403, {'error': 'Ce rapport appartient à un autre compte.'})
                        return
                    stored_report.update({
                        key: value for key, value in report.items()
                        if key not in {'id', 'owner', 'savedAt', 'files'}
                    })
                else:
                    report_id = uuid.uuid4().hex
                    timestamp = datetime.now().astimezone()
                    stored_report = dict(report)
                    stored_report.update({
                        'id': report_id,
                        'savedAt': timestamp.isoformat(timespec='seconds'),
                        'owner': user['username'],
                        'directorySavedAt': timestamp.isoformat(timespec='seconds'),
                        'files': {'json': f'Rapport_Maturite_IA_{report_id}.json'},
                    })
                    report_path = REPORTS / stored_report['files']['json']

                if html is not None:
                    stem = f'Rapport_Maturite_IA_{report_id}'
                    files = dict(stored_report.get('files', {}))
                    html_name = f'{stem}.html'
                    (REPORTS / html_name).write_text(html, encoding='utf-8')
                    files['html'] = html_name
                    browser = find_browser()
                    if browser:
                        with tempfile.TemporaryDirectory(prefix='rapport-ia-') as temp_directory:
                            temp_directory = Path(temp_directory)
                            html_path = temp_directory / 'rapport.html'
                            pdf_path = temp_directory / 'rapport.pdf'
                            profile_path = temp_directory / 'browser-profile'
                            html_path.write_text(html, encoding='utf-8')
                            command = [
                                browser, '--headless', '--disable-gpu', '--disable-extensions',
                                '--no-first-run', '--no-default-browser-check', '--no-pdf-header-footer',
                                f'--user-data-dir={profile_path}', f'--print-to-pdf={pdf_path}', html_path.as_uri(),
                            ]
                            result = subprocess.run(command, capture_output=True, text=True, timeout=90)
                            if result.returncode == 0 and pdf_path.is_file() and pdf_path.stat().st_size >= 500:
                                pdf_name = f'{stem}.pdf'
                                shutil.copy2(pdf_path, REPORTS / pdf_name)
                                files['pdf'] = pdf_name
                    stored_report['files'] = files
                stored_report['owner'] = stored_report.get('owner') or user['username']
                report_path.write_text(json.dumps(stored_report, ensure_ascii=False, indent=2), encoding='utf-8')
                self._send_json(200, {
                    'id': report_id,
                    'savedAt': stored_report['savedAt'],
                    'files': stored_report['files'],
                    'owner': stored_report['owner'],
                })
                return

            self._send_json(404, {'error': 'Route introuvable.'})
        except (ValueError, json.JSONDecodeError) as error:
            self._send_json(400, {'error': str(error)})
        except Exception as error:
            self._send_json(500, {'error': str(error)})


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', PORT), ReportHandler)
    print(f'Site disponible sur http://127.0.0.1:{PORT}/login.html', flush=True)
    print(f'Les rapports seront enregistrés dans : {REPORTS}', flush=True)
    print('Compte initial : admin / admin (changez le mot de passe après connexion).', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nArrêt du serveur.')
    finally:
        server.server_close()