// Skill helper: the Skill table is a shared dictionary.
// Jobs and candidate profiles reference skills by name; we look the name up
// case-insensitively and create it if it does not exist yet, then return ids.

const prisma = require('../lib/prisma');

async function upsertSkillByName(name) {
  const trimmed = name.trim();
  const existing = await prisma.skill.findFirst({
    where: { name: { equals: trimmed, mode: 'insensitive' } },
  });
  if (existing) return existing;
  return prisma.skill.create({ data: { name: trimmed } });
}

// Accepts ["React", "Node.js", ...] and returns [{ skillId, ...extras }]
async function resolveSkills(names) {
  const skills = await Promise.all(names.map(upsertSkillByName));
  return skills.map((skill) => ({ skillId: skill.id }));
}

module.exports = { upsertSkillByName, resolveSkills };
