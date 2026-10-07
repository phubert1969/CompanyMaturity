# Tests unitaires du référentiel de maturité IA.
# Ils vérifient que le classeur V3 contient bien les 15 questions attendues,
# que les calculs de score sont cohérents et que les plans d’action restent valides.
import unittest

from maturity_config import enrich_report, load_maturity_config


class MaturityConfigTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = load_maturity_config()

    def make_report(self, scores):
        return {
            'profile': {'secteur': ['Industrie']},
            'answers': [
                {'id': question['id'], 'score': scores[index]}
                for index, question in enumerate(self.config['questions'])
            ],
        }

    def test_workbook_contains_all_question_analyses(self):
        self.assertEqual(len(self.config['questions']), 15)
        self.assertEqual(len(self.config['maturityLevels']), 5)
        self.assertEqual(
            {len(question['options']) for question in self.config['questions']},
            {6},
        )
        self.assertEqual(
            {key for question in self.config['questions'] for option in question['options'] for key in option['analysis']},
            {'acquired', 'blocker', 'capability', 'action', 'outcome'},
        )

    def test_enriches_scores_and_action_plans(self):
        report = enrich_report(self.make_report([index % 6 for index in range(15)]), self.config)

        self.assertAlmostEqual(report['overall'], 2.2)
        self.assertEqual(len(report['axes']), 5)
        self.assertEqual(len(report['stages']), 3)
        self.assertEqual(len(report['axisAnalysis']), 5)
        self.assertEqual(len(report['strengths']), 3)
        self.assertEqual(len(report['watchPoints']), 3)
        self.assertEqual(len(report['priorityActions']), 3)
        self.assertEqual(len(report['mediumTermActions']), 10)
        self.assertTrue(all(len(axis['answers']) == 3 for axis in report['axisAnalysis']))
        self.assertTrue(all(sum(action['axe'] == axis for action in report['mediumTermActions']) == 2 for axis in self.config['axes']))
        self.assertEqual(report['profile'], {'secteur': ['Industrie']})
        for action in report['mediumTermActions']:
            question = next(item for item in self.config['questions'] if item['id'] == action['id'])
            previous_level = next(item for item in question['options'] if item['score'] == action['targetScore'] - 1)
            self.assertEqual(action['action'], previous_level['analysis']['action'])

    def test_medium_term_targets_use_previous_level_at_score_bounds(self):
        for scores, target_score, source_score in [([0] * 15, 1, 0), ([5] * 15, 5, 4)]:
            report = enrich_report(self.make_report(scores), self.config)

            self.assertTrue(all(action['targetScore'] == target_score for action in report['mediumTermActions']))
            for action in report['mediumTermActions']:
                question = next(item for item in self.config['questions'] if item['id'] == action['id'])
                source_level = next(item for item in question['options'] if item['score'] == source_score)
                self.assertEqual(action['action'], source_level['analysis']['action'])

    def test_ties_prioritize_stage_then_preserve_axis_order(self):
        report = enrich_report(self.make_report([5] * 15), self.config)

        strongest_stage = self.config['stages'][-1]
        earliest_stage = self.config['stages'][0]
        self.assertEqual([answer['type'] for answer in report['strengths']], [strongest_stage] * 3)
        self.assertEqual([answer['type'] for answer in report['watchPoints']], [earliest_stage] * 3)
        self.assertEqual(
            [answer['axe'] for answer in report['strengths']],
            self.config['axes'][:3],
        )
        self.assertEqual(
            [answer['axe'] for answer in report['watchPoints']],
            self.config['axes'][:3],
        )

    def test_rejects_incomplete_questionnaires(self):
        report = self.make_report([3] * 15)
        report['answers'].pop()

        with self.assertRaises(ValueError):
            enrich_report(report, self.config)


if __name__ == '__main__':
    unittest.main()