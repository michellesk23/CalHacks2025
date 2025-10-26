import sys
import json
from eligibility.ebt_eligibility import check_eligibility

def main():
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw)
        result = check_eligibility(payload)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()

