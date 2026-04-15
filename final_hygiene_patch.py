# 1. Strip dead imports from app.py
with open('app.py', 'r') as f:
    app_code = f.read()
app_code = app_code.replace("import math\n", "")
app_code = app_code.replace("from functools import lru_cache\n", "")
with open('app.py', 'w') as f:
    f.write(app_code)

# 2. Remove google-cloud-translate from requirements.txt
with open('requirements.txt', 'r') as f:
    reqs = f.readlines()
with open('requirements.txt', 'w') as f:
    for r in reqs:
        if "google-cloud-translate" not in r:
            f.write(r)

# 3. Sanitize deploy.py credentials path
with open('deploy.py', 'r') as f:
    deploy_code = f.read()
bad_path = 'SA_KEY_PATH = "/Users/navratanbugalia/Desktop/Antigravity/cue-app-promptwars-c91a1c2eeb92.json"'
good_path = 'SA_KEY_PATH = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "service-account.json")'
deploy_code = deploy_code.replace(bad_path, good_path)
with open('deploy.py', 'w') as f:
    f.write(deploy_code)
