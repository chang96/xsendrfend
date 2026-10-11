// GET /api/app-manifest?alias=&app=&n=&g=&bg=&fg=  ->  web app manifest for one generated app
const { parse, manifest } = require("./_app");

module.exports = (req, res) => {
    const a = parse(req.query);
    if (!a) { res.statusCode = 400; return res.end("bad request"); }
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.end(JSON.stringify(manifest(a)));
};
