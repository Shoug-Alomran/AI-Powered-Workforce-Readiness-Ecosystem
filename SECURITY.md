# Security Policy

## Supported Versions

Fursah is currently under active development. Security updates are applied to the latest version of the project available on the `main` branch.

| Version | Supported |
| ------- | --------- |
| Latest version on `main` | :white_check_mark: |
| Older commits or deployments | :x: |

Because Fursah is currently a prototype developed for the AI Readiness Hackathon, formal versioned releases are not yet maintained.

## Reporting a Vulnerability

If you discover a security vulnerability in Fursah, please report it privately rather than creating a public GitHub issue.

### How to Report

Use GitHub's private vulnerability reporting feature for this repository, if available.

When submitting a report, please include:

- A clear description of the vulnerability.
- The affected page, endpoint, component, or feature.
- Steps required to reproduce the issue.
- The potential security or privacy impact.
- Screenshots, logs, or proof-of-concept information where relevant.
- Any suggested mitigation, if known.

Please do not include real passwords, API keys, access tokens, personal data, or other sensitive information in the report.

## Response Process

Security reports will be reviewed as soon as reasonably possible.

After a report is received:

1. The issue will be reviewed and reproduced where possible.
2. Its security and privacy impact will be assessed.
3. A fix or mitigation will be developed for confirmed vulnerabilities.
4. Relevant security controls and affected functionality will be retested.
5. The reporter will be informed whether the issue was accepted, requires additional information, or could not be reproduced.

No specific response or resolution timeframe is guaranteed while Fursah remains a prototype.

## Responsible Disclosure

Please allow sufficient time for a reported vulnerability to be investigated and addressed before publicly disclosing technical details.

Do not intentionally:

- Access or modify another user's data.
- Attempt to obtain credentials, tokens, secrets, or private evidence.
- Perform denial-of-service or resource-exhaustion testing.
- Upload malicious files or payloads to production services.
- Exploit a vulnerability beyond what is necessary to demonstrate its existence.
- Use automated testing that could disrupt the production deployment.

## Security Scope

Security-sensitive areas of Fursah include:

- Authentication and authorization.
- Role-based access between students, employers, universities, and administrators.
- Student evidence and uploaded documents.
- Employer and applicant information.
- API routes and server-side operations.
- AI-assisted document analysis.
- Readiness and matching calculations.
- Administrative review and governance functionality.
- Database access and data isolation.
- Cloud storage and evidence retrieval.
- Environment variables, API credentials, and service secrets.

## Data and AI Security

Fursah separates AI-assisted functionality from consequential scoring.

AI may assist with document interpretation and grounded explanations, while readiness and matching scores are calculated using deterministic, version-controlled rules. Evidence requiring verification must undergo the appropriate review process before it contributes to consequential scoring.

Security or privacy issues involving AI-generated output, evidence processing, unauthorized information disclosure, or circumvention of human-review controls should also be reported as security concerns.

## Secrets

API keys, database credentials, cloud-storage credentials, authentication secrets, and other sensitive configuration values must never be committed to the repository.

If a secret is accidentally exposed, it should be considered compromised and rotated immediately.

## Disclaimer

Fursah is currently a hackathon prototype and should not be considered a production-certified employment, recruitment, or automated decision-making system. Security controls will continue to evolve as the platform progresses toward production readiness.
