/*
 * lesson-data.js
 *
 * Small shared helpers for pulling values out of the canonical `lesson`
 * object (see the contract documented at the top of render-slides-html.js).
 * Used by both the HTML/PDF renderer and the PPTX builder so the two
 * outputs never drift out of sync on how a field key maps to lesson data.
 */

function getQaItems(lesson, group, startIndex, count) {
  const source = lesson[group] || [];
  return source.slice(startIndex, startIndex + count);
}

function buildDynamicValue(lesson, key) {
  switch (key) {
    case "coverTitle":
      return lesson.coverTitle || "";
    case "coverLevel":
      return lesson.coverLevel || "";
    case "agendaTopicLine":
      return `Conversation about ${lesson.topic || lesson.coverTitle || ""}`;
    case "introTitle":
      return lesson.language === "spanish" ? "INTRODUCCIÓN" : "INTRODUCTION";
    case "objectivesDividerTitle":
      return lesson.language === "spanish" ? "OBJETIVOS" : "GOALS";
    case "objectivesTitle":
      return lesson.language === "spanish" ? "OBJETIVOS DE LA ACTIVIDAD" : "GOALS OF THE ACTIVITY";
    case "objectives":
      return lesson.objectives || [];
    case "vocabulary":
      return lesson.vocabulary || [];
    case "introText":
      return lesson.introText || "";
    default:
      return "";
  }
}

module.exports = { getQaItems, buildDynamicValue };
