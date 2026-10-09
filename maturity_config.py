# Ce module lit le classeur Excel V3, extrait les 15 questions et les niveaux de maturité,
# puis enrichit les rapports soumis par l’utilisateur avec les moyennes, analyses et plans d’action.
import hashlib
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parent
WORKBOOK = ROOT / 'Data' / 'Matrice_Roadmap_Maturite_IA_V3.xlsm'
NAMESPACE = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
RELATIONSHIP_NAMESPACE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'


# Construit le nom XML complet d’une balise dans le format Office Open XML.
def _tag(name):
    return f'{{{NAMESPACE}}}{name}'


def _text(element):
    return ''.join(part.text or '' for part in element.iter(_tag('t')))


def _worksheet_path(target):
    path = target.lstrip('/')
    return path if path.startswith('xl/') else f'xl/{path}'


def _read_cells(archive, path, shared_strings):
    root = ET.fromstring(archive.read(path))
    cells = {}
    for cell in root.findall(f'.//{_tag("c")}'):
        cell_type = cell.get('t')
        value = cell.find(_tag('v'))
        if cell_type == 'inlineStr':
            text = _text(cell.find(_tag('is')))
        elif value is None:
            text = ''
        elif cell_type == 's':
            text = shared_strings[int(value.text)]
        else:
            text = value.text or ''
        cells[cell.get('r')] = text
    return cells


def maturity_level_score(overall):
    return max(0, min(5, int(overall + 0.5)))


# Charge le référentiel complet depuis le classeur Excel.
# Il retourne les questions, leurs options de score, les niveaux de maturité et leurs axes/stades.
def load_maturity_config(workbook_path=WORKBOOK):
    workbook_path = Path(workbook_path)
    with zipfile.ZipFile(workbook_path) as archive:
        workbook = ET.fromstring(archive.read('xl/workbook.xml'))
        relationships = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        targets = {item.get('Id'): item.get('Target') for item in relationships}
        sheets = {
            sheet.get('name'): _worksheet_path(targets[sheet.get(f'{{{RELATIONSHIP_NAMESPACE}}}id')])
            for sheet in workbook.findall(f'.//{_tag("sheet")}')
        }
        if 'xl/sharedStrings.xml' in archive.namelist():
            shared_root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            shared_strings = [_text(item) for item in shared_root.findall(_tag('si'))]
        else:
            shared_strings = []

        questions = []
        for question_id in range(1, 16):
            sheet_name = f'Q{question_id:02d}'
            if sheet_name not in sheets:
                raise ValueError(f"L'onglet {sheet_name} est absent du classeur V3.")
            cells = _read_cells(archive, sheets[sheet_name], shared_strings)
            title = cells.get('A1', '')
            title_parts = [part.strip() for part in title.split(' - ')]
            if len(title_parts) < 3 or not cells.get('B2'):
                raise ValueError(f"Les métadonnées de l'onglet {sheet_name} sont incomplètes.")

            levels = []
            for score in range(6):
                row = score + 5
                fields = [cells.get(f'{column}{row}', '').strip() for column in 'BCDEFGH']
                if not all(fields):
                    raise ValueError(f"L'analyse de {sheet_name}, score {score}, est incomplète.")
                levels.append({
                    'score': score,
                    'label': fields[0],
                    'description': fields[1],
                    'analysis': {
                        'acquired': fields[2],
                        'blocker': fields[3],
                        'capability': fields[4],
                        'action': fields[5],
                        'outcome': fields[6],
                    },
                })

            questions.append({
                'id': sheet_name,
                'axe': title_parts[1].title(),
                'type': title_parts[2],
                'question': cells['B2'].strip(),
                'options': levels,
            })

        maturity_levels = []
        if 'NiveauMaturité' not in sheets:
            raise ValueError("L'onglet NiveauMaturité est absent du classeur V3.")
        maturity_cells = _read_cells(archive, sheets['NiveauMaturité'], shared_strings)
        for score in range(6):
            row = score + 3
            name = maturity_cells.get(f'B{row}', '').strip()
            if not name:
                raise ValueError(f'Le niveau de maturité {score} est absent du classeur V3.')
            maturity_levels.append({
                'score': score,
                'name': name,
                'description': maturity_cells.get(f'C{row}', '').strip(),
                'acquired': maturity_cells.get(f'D{row}', '').strip(),
                'symbol': maturity_cells.get(f'E{row}', '').strip(),
            })

    digest = hashlib.sha256(workbook_path.read_bytes()).hexdigest()[:12]
    return {
        'version': f'V3-{digest}',
        'questions': questions,
        'maturityLevels': maturity_levels,
        'axes': list(dict.fromkeys(question['axe'] for question in questions)),
        'stages': list(dict.fromkeys(question['type'] for question in questions)),
    }


# Enrichit un rapport brut avec les calculs métier utiles à l’affichage :
# moyenne par axe, moyenne par stade, niveau de maturité, forces, vigilance, plans d’action.
def enrich_report(report, config):
    submitted_answers = report.get('answers')
    if not isinstance(submitted_answers, list):
        raise ValueError('Les réponses du questionnaire sont absentes.')
    if any(not isinstance(answer, dict) for answer in submitted_answers):
        raise ValueError('Le format des réponses du questionnaire est invalide.')

    submitted_by_id = {answer.get('id'): answer for answer in submitted_answers}
    questions_by_id = {question['id']: question for question in config['questions']}
    if len(submitted_answers) != len(questions_by_id) or set(submitted_by_id) != set(questions_by_id):
        raise ValueError('Le questionnaire doit contenir une réponse unique à chacune des 15 questions.')

    answers = []
    for question in config['questions']:
        submitted = submitted_by_id[question['id']]
        score = submitted.get('score')
        if isinstance(score, bool) or not isinstance(score, int):
            raise ValueError(f"Le score de {question['id']} doit être un entier.")
        option = next((item for item in question['options'] if item['score'] == score), None)
        if option is None:
            raise ValueError(f"Le score de {question['id']} doit être compris entre 0 et 5.")
        answers.append({
            'id': question['id'],
            'question': question['question'],
            'axe': question['axe'],
            'type': question['type'],
            'score': score,
            'label': option['label'],
            'description': option['description'],
            'analysis': option['analysis'],
        })

    axes = {
        axis: sum(answer['score'] for answer in answers if answer['axe'] == axis)
        / sum(question['axe'] == axis for question in config['questions'])
        for axis in config['axes']
    }
    stages = {
        stage: sum(answer['score'] for answer in answers if answer['type'] == stage)
        / sum(question['type'] == stage for question in config['questions'])
        for stage in config['stages']
    }
    overall = sum(answer['score'] for answer in answers) / len(answers)
    level_score = maturity_level_score(overall)
    maturity = next(item for item in config['maturityLevels'] if item['score'] == level_score)

    # On construit une liste avec un élément par couple (axe, stade). Le stade est
    # stocké dans la clé `type` de chaque réponse. L’ordre d’origine suit les stades,
    # puis les axes, tels qu’ils apparaissent dans le classeur.
    ranked_answers = [
        next(answer for answer in answers if answer['axe'] == axis and answer['type'] == stage)
        for stage in config['stages']
        for axis in config['axes']
    ]

    # Chaque stade reçoit un rang numérique selon l’ordre déclaré dans le classeur.
    # Cela permet de comparer les stades sans supposer que leur nom est un nombre.
    stage_order = {stage: index for index, stage in enumerate(config['stages'])}

    # Les tris utilisent deux critères, dans cet ordre :
    # 1) le score, pour trouver les meilleures ou les moins bonnes réponses ;
    # 2) le rang du stade pour départager les scores identiques.
    # Pour une force, un stade plus avancé est prioritaire ; pour une vigilance,
    # un stade plus précoce l’est. Si le score et le stade sont tous deux égaux,
    # le tri stable conserve l’ordre des axes issu du classeur.
    strengths = sorted(
        ranked_answers,
        key=lambda answer: (-answer['score'], -stage_order[answer['type']]),
    )[:3]
    watch_points = sorted(
        ranked_answers,
        key=lambda answer: (answer['score'], stage_order[answer['type']]),
    )[:3]
    watch_point_ids = {answer['id'] for answer in watch_points}

    # Pour le plan à moyen terme, on sélectionne les deux questions les moins bien notées
    # de chaque axe. Les points déjà classés parmi les 3 vigilances globales (ainsi que
    # les scores à zéro) reçoivent une cible un point au-dessus, plafonnée à 5.
    # Pour les autres réponses sélectionnées, la cible reste leur niveau actuel : l’action
    # provient dans tous les cas du palier immédiatement inférieur à cette cible.
    medium_term_actions = []
    for axis in config['axes']:
        axis_answers = [answer for answer in answers if answer['axe'] == axis]
        weakest_stages = sorted(axis_answers, key=lambda answer: answer['score'])[:2]
        for answer in weakest_stages:
            target_score = answer['score']
            if answer['id'] in watch_point_ids or target_score == 0:
                target_score = min(target_score + 1, 5)
            question = questions_by_id[answer['id']]
            previous_level = next(item for item in question['options'] if item['score'] == target_score - 1)
            medium_term_actions.append({
                'id': answer['id'],
                'axe': answer['axe'],
                'type': answer['type'],
                'question': answer['question'],
                'currentScore': answer['score'],
                'targetScore': target_score,
                'action': previous_level['analysis']['action'],
            })
    axis_analysis = [
        {
            'axe': axis,
            'score': axes[axis],
            'answers': [answer for answer in answers if answer['axe'] == axis],
        }
        for axis in config['axes']
    ]

    enriched = dict(report)
    enriched.update({
        'analysisVersion': config['version'],
        'overall': overall,
        'axes': axes,
        'stages': stages,
        'maturity': maturity,
        'answers': answers,
        'axisAnalysis': axis_analysis,
        'strengths': strengths,
        'watchPoints': watch_points,
        'priorityActions': [
            {**answer, 'action': answer['analysis']['action']}
            for answer in watch_points
        ],
        'mediumTermActions': medium_term_actions,
    })
    return enriched