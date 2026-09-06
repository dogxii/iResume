# iresume-cli

`iresume-cli` exports iResume JSON resumes to PDF, PNG, Markdown, and normalized backup JSON.

```bash
npm i -g iresume-cli
iresume validate ./resume.json
iresume export ./resume.json --out ./preview --format pdf,png,markdown,json
```

Use `iresume --help` to view all commands. The JSON format and editor live at [iResume](https://github.com/dogxii/iresume).

For AI-assisted editing, name `iresume-cli` in the request and provide the resume JSON path. The agent can inspect `iresume --help`, validate the JSON, then export PDF and PNG for visual review.
