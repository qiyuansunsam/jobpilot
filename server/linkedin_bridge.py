"""
LinkedIn API bridge for JobPilot.
- Browser-based login via Playwright (captures cookies)
- Voyager API for job search/details
- Playwright for Easy Apply automation
"""
import sys
import json
import os
import pickle
import time

COOKIE_DIR = os.path.join(os.path.dirname(__file__), ".linkedin_sessions")
os.makedirs(COOKIE_DIR, exist_ok=True)


def get_cookie_path(user_id: str) -> str:
    safe = "".join(c if c.isalnum() else "_" for c in user_id)
    return os.path.join(COOKIE_DIR, f"{safe}.pkl")


def browser_login(user_id: str):
    """Open a real browser window for LinkedIn login, wait for user to complete, capture cookies."""
    from playwright.sync_api import sync_playwright

    cookie_path = get_cookie_path(user_id)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=['--start-maximized'])
        context = browser.new_context(
            viewport={'width': 1280, 'height': 900},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        page.goto('https://www.linkedin.com/login')

        # Wait for user to login — detect by checking for feed page or li_at cookie
        print(json.dumps({"status": "waiting", "message": "Browser opened. Please log in to LinkedIn..."}), flush=True)

        # Poll for login completion (max 120 seconds)
        for _ in range(240):
            time.sleep(0.5)
            cookies = context.cookies()
            li_at = next((c for c in cookies if c['name'] == 'li_at'), None)
            if li_at:
                # Got the auth cookie — save all cookies
                import requests
                jar = requests.cookies.RequestsCookieJar()
                for c in cookies:
                    if c['domain'].endswith('linkedin.com'):
                        jar.set(c['name'], c['value'], domain=c['domain'], path=c.get('path', '/'))
                with open(cookie_path, 'wb') as f:
                    pickle.dump(jar, f)

                # Get profile name
                try:
                    from linkedin_api import Linkedin
                    api = Linkedin('', '', cookies=jar)
                    profile = api.get_user_profile()
                    mini = profile.get('miniProfile', {})
                    name = f"{mini.get('firstName', '')} {mini.get('lastName', '')}".strip()
                except Exception:
                    name = "LinkedIn User"

                browser.close()
                return {"ok": True, "name": name}

            # Check if page navigated away from login
            url = page.url
            if '/feed' in url or '/mynetwork' in url or '/jobs' in url:
                time.sleep(2)  # Give cookies a moment to settle
                continue

        browser.close()
        return {"ok": False, "error": "Login timed out (2 minutes). Please try again."}


def get_api(user_id: str):
    """Get authenticated Linkedin API from cached cookies."""
    cookie_path = get_cookie_path(user_id)
    if not os.path.exists(cookie_path):
        return None

    with open(cookie_path, 'rb') as f:
        cookies = pickle.load(f)

    from linkedin_api import Linkedin
    api = Linkedin('', '', cookies=cookies)
    return api


def easy_apply(user_id: str, job_id: str, answers: dict = None):
    """Use Playwright to click Easy Apply on a LinkedIn job."""
    from playwright.sync_api import sync_playwright

    cookie_path = get_cookie_path(user_id)
    if not os.path.exists(cookie_path):
        return {"ok": False, "error": "Not logged in"}

    with open(cookie_path, 'rb') as f:
        cookies_jar = pickle.load(f)

    # Convert requests cookies to playwright format
    pw_cookies = []
    for cookie in cookies_jar:
        pw_cookies.append({
            'name': cookie.name,
            'value': cookie.value,
            'domain': cookie.domain,
            'path': cookie.path or '/',
        })

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=['--start-maximized'])
        context = browser.new_context(
            viewport={'width': 1280, 'height': 900},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        )
        context.add_cookies(pw_cookies)

        page = context.new_page()
        job_url = f'https://www.linkedin.com/jobs/view/{job_id}/'
        page.goto(job_url, wait_until='domcontentloaded')
        page.wait_for_timeout(3000)

        result = {"ok": False, "error": "Could not find Easy Apply button", "steps": []}

        try:
            # Look for Easy Apply button
            easy_apply_btn = page.locator('button.jobs-apply-button, button[aria-label*="Easy Apply"]').first
            if easy_apply_btn.is_visible(timeout=5000):
                result["steps"].append("Found Easy Apply button")
                easy_apply_btn.click()
                page.wait_for_timeout(2000)

                # Handle multi-step application
                max_steps = 10
                for step in range(max_steps):
                    page.wait_for_timeout(1500)

                    # Check for submit button
                    submit_btn = page.locator('button[aria-label="Submit application"], button:has-text("Submit application")').first
                    if submit_btn.is_visible(timeout=2000):
                        submit_btn.click()
                        page.wait_for_timeout(2000)
                        result = {"ok": True, "message": "Application submitted!", "steps": result["steps"]}
                        result["steps"].append("Submitted application")
                        break

                    # Check for review button
                    review_btn = page.locator('button[aria-label="Review your application"], button:has-text("Review")').first
                    if review_btn.is_visible(timeout=1000):
                        review_btn.click()
                        result["steps"].append("Clicked Review")
                        continue

                    # Check for next button
                    next_btn = page.locator('button[aria-label="Continue to next step"], button:has-text("Next")').first
                    if next_btn.is_visible(timeout=1000):
                        next_btn.click()
                        result["steps"].append(f"Clicked Next (step {step+1})")
                        continue

                    # If we're stuck, check for dismiss/close
                    result["steps"].append(f"Step {step+1}: Waiting for form...")

                    # Try to fill any visible text inputs with AI answers
                    if answers:
                        text_inputs = page.locator('input[type="text"]:visible, textarea:visible').all()
                        for inp in text_inputs:
                            label_text = ""
                            try:
                                label_id = inp.get_attribute('id')
                                if label_id:
                                    label_el = page.locator(f'label[for="{label_id}"]')
                                    if label_el.count() > 0:
                                        label_text = label_el.first.inner_text()
                            except:
                                pass
                            if label_text and label_text in answers:
                                inp.fill(answers[label_text])
                                result["steps"].append(f"Filled: {label_text}")
            else:
                # Not an Easy Apply job
                result["error"] = "This job doesn't support Easy Apply. It redirects to the company's website."

        except Exception as e:
            result["error"] = str(e)
            result["steps"].append(f"Error: {str(e)}")

        # Take a screenshot for debugging
        try:
            screenshot_path = os.path.join(COOKIE_DIR, f"apply_{job_id}.png")
            page.screenshot(path=screenshot_path)
            result["screenshot"] = screenshot_path
        except:
            pass

        page.wait_for_timeout(2000)
        browser.close()

    return result


def main():
    raw = sys.stdin.read()
    req = json.loads(raw)

    method = req["method"]
    args = req.get("args", {})
    user_id = req.get("user_id", "default")

    if method == "browser_login":
        result = browser_login(user_id)
        print(json.dumps(result))
        return

    if method == "check_session":
        cookie_path = get_cookie_path(user_id)
        if not os.path.exists(cookie_path):
            print(json.dumps({"authenticated": False}))
            return
        try:
            api = get_api(user_id)
            if not api:
                print(json.dumps({"authenticated": False}))
                return
            profile = api.get_user_profile()
            # Detect 401/expired session
            if isinstance(profile, dict) and profile.get("status") in (401, 403):
                if os.path.exists(cookie_path):
                    os.remove(cookie_path)
                print(json.dumps({"authenticated": False}))
                return
            mini = profile.get("miniProfile", {})
            name = f"{mini.get('firstName', '')} {mini.get('lastName', '')}".strip()
            if not name:
                # If we can't get a name, session might be invalid
                if os.path.exists(cookie_path):
                    os.remove(cookie_path)
                print(json.dumps({"authenticated": False}))
                return
            print(json.dumps({
                "authenticated": True,
                "name": name,
                "headline": mini.get("occupation", ""),
            }))
        except Exception:
            if os.path.exists(cookie_path):
                os.remove(cookie_path)
            print(json.dumps({"authenticated": False}))
        return

    if method == "logout":
        cookie_path = get_cookie_path(user_id)
        if os.path.exists(cookie_path):
            os.remove(cookie_path)
        print(json.dumps({"ok": True}))
        return

    if method == "easy_apply":
        job_id = args.get("job_id")
        ai_answers = args.get("answers", {})
        result = easy_apply(user_id, job_id, ai_answers)
        print(json.dumps(result, default=str))
        return

    # All other methods need a valid session
    api = get_api(user_id)
    if not api:
        print(json.dumps({"error": "Not authenticated. Please login via browser first."}))
        sys.exit(1)

    # Quick session validity check
    profile_check = api.get_user_profile()
    if isinstance(profile_check, dict) and profile_check.get("status") in (401, 403):
        cookie_path = get_cookie_path(user_id)
        if os.path.exists(cookie_path):
            os.remove(cookie_path)
        print(json.dumps({"error": "Session expired. Please login again."}))
        sys.exit(1)

    if method == "search_jobs":
        limit = args.pop("limit", 25)
        listed_at = args.pop("listed_at", 2592000)  # 30 days default
        # Remove None values from args to avoid API errors
        clean_args = {k: v for k, v in args.items() if v is not None}
        jobs = api.search_jobs(limit=limit, listed_at=listed_at, **clean_args)
        results = []
        for job in jobs:
            urn = job.get("dashEntityUrn", "") or job.get("entityUrn", "")
            job_id = urn.split(":")[-1] if urn else ""
            company_name = ""
            company_details = job.get("companyDetails", {})
            if isinstance(company_details, dict):
                for key, val in company_details.items():
                    if isinstance(val, dict):
                        cr = val.get("companyResolutionResult", {})
                        if isinstance(cr, dict):
                            company_name = cr.get("name", "")
                            break
            results.append({
                "job_id": job_id,
                "title": job.get("title", ""),
                "company": company_name,
                "location": job.get("formattedLocation", ""),
                "listed_at": job.get("listedAt", ""),
                "work_remote_allowed": job.get("workRemoteAllowed", False),
            })
        print(json.dumps(results))

    elif method == "get_job":
        job_id = args["job_id"]
        job = api.get_job(job_id)
        desc = job.get("description", "")
        if isinstance(desc, dict):
            desc = desc.get("text", "")
        else:
            desc = str(desc)

        company_name = ""
        company_detail = job.get("companyDetails")
        if isinstance(company_detail, dict):
            for key, val in company_detail.items():
                if isinstance(val, dict) and "name" in val:
                    company_name = val["name"]
                    break

        apply_url = ""
        is_easy_apply = False
        apply_method = job.get("applyMethod")
        if isinstance(apply_method, dict):
            for key, val in apply_method.items():
                if "OffsiteApply" in key and isinstance(val, dict):
                    apply_url = val.get("companyApplyUrl", "")
                if "ComplexOnsiteApply" in key or "SimpleOnsiteApply" in key:
                    is_easy_apply = True

        result = {
            "job_id": job_id,
            "title": job.get("title", ""),
            "description": desc,
            "company": company_name,
            "location": job.get("formattedLocation", ""),
            "employment_type": job.get("employmentType", ""),
            "experience_level": job.get("experienceLevel", ""),
            "apply_url": apply_url,
            "is_easy_apply": is_easy_apply,
        }
        print(json.dumps(result, default=str))

    elif method == "get_job_skills":
        job_id = args["job_id"]
        skills = api.get_job_skills(job_id)
        print(json.dumps(skills, default=str))

    else:
        print(json.dumps({"error": f"Unknown method: {method}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
