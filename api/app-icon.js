// GET /api/app-icon?alias=&app=&n=&g=&bg=&fg=[&maskable=1]  ->  the app's icon as SVG
const { parse, iconSvg } = require("./_app");

module.exports = (req, res) => {
    const a = parse(req.query);
    if (!a) { res.statusCode = 400; return res.end("bad request"); }
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.end(iconSvg(a, req.query.maskable === "1"));
};
