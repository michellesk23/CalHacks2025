#!/usr/bin/env python3
"""
CLI wrapper around ebt_eligibility.check_eligibility.

Reads one product JSON object from stdin and prints the eligibility JSON.

Example:
  echo '{"name":"Coke","categories":["en:beverages"],"ingredients":"water, sugar","nutrients":{}}' \
    | python3 eligibility/run_check.py
"""

import sys
import json
from ebt_eligibility import check_eligibility


def main():
    try:
        data = sys.stdin.read()
        product = json.loads(data)
    except Exception as e:
        print(json.dumps({"error": f"invalid_input: {e}"}))
        sys.exit(1)

    try:
        result = check_eligibility(product)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": f"eligibility_error: {e}"}))
        sys.exit(2)


if __name__ == "__main__":
    main()


