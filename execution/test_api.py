import requests
import sys

BASE_URL = "http://localhost:3000"

def log(msg, success=True):
    icon = "✅" if success else "❌"
    print(f"{icon} {msg}")

def test_parse_simple():
    """Test basic restaurant name parsing"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/parse",
            json={"input": "Vitrina Tel Aviv"}
        )
        data = response.json()
        if data.get("success") and data["restaurant"]["name"] == "Vitrina":
            log("Parse simple: PASSED")
        else:
            log(f"Parse simple: FAILED - {data}", False)
    except Exception as e:
        log(f"Parse simple: ERROR - {e}", False)

def test_parse_social():
    """Test social link extraction"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/parse",
            json={"input": "https://instagram.com/vitrina_tlv"}
        )
        data = response.json()
        if data.get("success"):
            log("Parse social link: PASSED")
        else:
            log(f"Parse social link: FAILED - {data}", False)
    except Exception as e:
        log(f"Parse social link: ERROR - {e}", False)

def test_parse_negative():
    """Test invalid input"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/parse",
            json={"input": "a"} # Too short
        )
        if response.status_code == 400:
            log("Parse negative (short input): PASSED")
        else:
            log(f"Parse negative: FAILED - Status {response.status_code}", False)
    except Exception as e:
        log(f"Parse negative: ERROR - {e}", False)

def test_restaurants_list():
    """Test fetching restaurant list"""
    try:
        response = requests.get(f"{BASE_URL}/api/restaurants")
        data = response.json()
        if data.get("success"):
            count = len(data.get('restaurants', []))
            log(f"List restaurants: PASSED ({count} found)")
        else:
            log(f"List restaurants: FAILED - {data}", False)
    except Exception as e:
        log(f"List restaurants: ERROR - {e}", False)

def test_add_restaurant():
    """Test adding a new restaurant"""
    try:
        payload = {
            "restaurant": {
                "name": "API Test Restaurant",
                "city": "Test City",
                "cuisine": "Testing"
            }
        }
        response = requests.post(f"{BASE_URL}/api/restaurants", json=payload)
        data = response.json()
        
        if data.get("success") and data["restaurant"]["name"] == "API Test Restaurant":
            log(f"Add restaurant: PASSED (ID: {data['restaurant']['id']})")
            return data['restaurant']['id']
        else:
            log(f"Add restaurant: FAILED - {data}", False)
            return None
    except Exception as e:
        log(f"Add restaurant: ERROR - {e}", False)
        return None

if __name__ == "__main__":
    print(f"Testing against {BASE_URL}...\n")
    test_parse_simple()
    test_parse_social()
    test_parse_negative()
    test_restaurants_list()
    test_add_restaurant()
    print("\nTest run complete.")
