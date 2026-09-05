from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

class HealthCheckTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/v1/health/'

    def test_liveness_check(self):
        response = self.client.get(self.url + '?type=liveness')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ok')
        self.assertNotIn('database', response.data)

    def test_readiness_check_success(self):
        response = self.client.get(self.url + '?type=readiness')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ok')
        self.assertEqual(response.data['database'], 'ok')
        self.assertEqual(response.data['cache'], 'ok')

    @patch('django.db.backends.utils.CursorWrapper.execute')
    def test_readiness_check_db_failure(self, mock_execute):
        mock_execute.side_effect = Exception("DB connection failed")
        
        response = self.client.get(self.url + '?type=readiness')
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data['status'], 'error')
        self.assertEqual(response.data['database'], 'error')
