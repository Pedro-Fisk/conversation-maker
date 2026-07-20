/*
 * GET /api/stats?accessCode=... — painel simples de uso por professor.
 * Retorna JSON { teachers: { "Nome": totalDeAulasGeradas, ... } },
 * ordenado do maior para o menor. Protegido pelo mesmo ACCESS_CODE.
 */

const { getTeacherStats } = require("../canva-lib");

module.exports = async function handler(req, res) {
  const { accessCode } = req.query || {};
  if (!process.env.ACCESS_CODE || accessCode !== process.env.ACCESS_CODE) {
    res.status(401).json({ error: "Código de acesso inválido." });
    return;
  }
  try {
    const stats = await getTeacherStats();
    const sorted = Object.fromEntries(Object.entries(stats).sort((a, b) => b[1] - a[1]));
    res.status(200).json({ teachers: sorted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Falha ao ler as estatísticas." });
  }
};
