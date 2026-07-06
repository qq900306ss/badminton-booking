# badminton-booking — Player Front-end

[中文](README.md) · **English** · [日本語](README.ja.md)

Badminton court management system: a drop-in player scans a QR code to enter → picks their identity → picks their skill level → queues / goes on court → watches the live court status.

🔗 **Live**: https://d2mg2bpjvlg672.cloudfront.net

## Related

| | URL |
|--|------|
| Host admin (admin) | https://d1r9u0ja59y4rv.cloudfront.net |
| Backend API | https://pp2p4ln2cogxt4mi5f2wl3rqi40vskvs.lambda-url.ap-northeast-1.on.aws |

## Local development

```bash
npm install
npm run dev   # http://localhost:5174
```

## Languages (i18n)

The UI ships in **Traditional Chinese / English / Japanese**. Switch with the 🌐 picker in the top-right corner; the choice is saved to `localStorage`. Translations live in `src/i18n/locales/*.json` (one `<Namespace>.<lang>.json` fragment per component).

## Deployment

Push to `main` → GitHub Actions automatically builds and uploads to S3 + invalidates CloudFront.
See `../DEPLOY.md` for the full deployment guide.
