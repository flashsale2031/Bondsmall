from pathlib import Path
from unittest.mock import Mock, patch
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import server_new


def run():
    client = server_new.app.test_client()

    bad = client.post('/api/craigslist/bulkpost/validate', json={
        'email': 'seller@example.com',
        'password': 'secret',
        'account_id': '123',
        'oauth_url': 'https://example.com/token',
        'api_base_url': 'https://bapi.craigslist.org/bulkpost/v1',
        'scope': 'bulkpost.posting',
    })
    assert bad.status_code == 400, bad.get_json()

    token_response = Mock()
    token_response.ok = True
    token_response.status_code = 200
    token_response.json.return_value = {
        'access_token': 'test-token',
        'expires_in': 3600,
        'scopes': ['bulkpost.posting'],
        'token_type': 'Bearer',
    }
    with patch.object(server_new.req_lib, 'post', return_value=token_response) as post:
        good = client.post('/api/craigslist/bulkpost/validate', json={
            'email': 'seller@example.com',
            'password': 'secret',
            'account_id': '123',
            'oauth_url': 'https://bapi.craigslist.org/bulkpost/oauth/access-token',
            'api_base_url': 'https://bapi.craigslist.org/bulkpost/v1',
            'scope': 'bulkpost.posting',
        })
    assert good.status_code == 200, good.get_json()
    body = good.get_json()
    assert body['ok'] is True
    assert body['scopes'] == ['bulkpost.posting']
    assert 'access_token' not in body
    sent = post.call_args.kwargs
    assert sent['data']['grant_type'] == 'client_credentials'
    assert sent['data']['scope'] == 'bulkpost.posting'
    assert sent['headers']['Authorization'].startswith('Basic ')

    seller = Path('seller.html').read_text(encoding='utf-8')
    for marker in (
        'bulkpost-account-id-',
        'bulkpost-api-base-',
        'bulkpost-oauth-url-',
        'bulkpost-scope-',
        '/api/craigslist/bulkpost/validate',
        'bulkpost_account_id: account.bulkpost_account_id ||',
    ):
        assert marker in seller, marker
    print('Craigslist Bulkpost regression checks passed')


if __name__ == '__main__':
    run()
