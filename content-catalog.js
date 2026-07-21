/*
 * content-catalog.js
 *
 * Catálogo dos pontos gramaticais de cada estágio do curso de inglês da
 * FISK (Essentials 1/2, Transitions 1/2, Fluency 1/2, In Focus Review),
 * extraído das tabelas de conteúdo reais dos livros. Usado por
 * api/generate-lesson.js para sortear pontos gramaticais e pedir que o
 * Language Game teste exatamente aquele conteúdo — e para depois anotar,
 * no rodapé de cada slide do Language Game, a qual livro/lição aquela
 * pergunta se refere (ver LANGUAGE_GAME_GUIDANCE / renderMultipleChoiceBlock).
 *
 * Cada item de "points" é uma lição/unidade real do livro. "code" é o
 * código curto exibido no rodapé do slide (ex.: "1A", "U3", "C5"); "title"
 * é o nome da lição só para dar contexto à IA; "grammar" resume o(s)
 * ponto(s) gramatical(is) daquela lição, que é o que a pergunta do
 * Language Game deve testar.
 */

const BOOK_CATALOG = {
  essentials1: {
    label: "Essentials 1",
    tier: "basic",
    points: [
      { code: "0", title: "Before you start", grammar: "What's your...? / I'm... / Do you have...? / a, an" },
      { code: "1A", title: "Getting to know you", grammar: "Do you...? / I, you" },
      { code: "1B", title: "Are you from New York?", grammar: "Are you...?" },
      { code: "2A", title: "At a fast-food place", grammar: "Do – short answers / we, you, they" },
      { code: "2B", title: "Eating habits", grammar: "Does – short answers / he, she, it" },
      { code: "3A", title: "Routines", grammar: "Do – long answers / What" },
      { code: "3B", title: "What time?", grammar: "Does – long answers / What time" },
      { code: "4A", title: "Family and friends", grammar: "Be (present) / Who" },
      { code: "4B", title: "Celebrities", grammar: "Where / Possessive adjectives" },
      { code: "5A", title: "You look great", grammar: "Present Continuous" },
      { code: "5B", title: "Celebrations", grammar: "When / Dates" },
      { code: "6A", title: "Can you do it?", grammar: "Can (ability)" },
      { code: "6B", title: "At the gym", grammar: "Why / because / Imperative" },
      { code: "7A", title: "City spots", grammar: "There is / there are / Plural" },
      { code: "7B", title: "Getting around", grammar: "Prepositions of place" },
      { code: "8A", title: "Traveling abroad", grammar: "Going to (present)" },
      { code: "8B", title: "At a hotel", grammar: "Objective pronouns" },
      { code: "9A", title: "Lights, camera, action!", grammar: "Did – Regular verbs" },
      { code: "9B", title: "I heart music", grammar: "Time expressions (past)" },
      { code: "10A", title: "Going out on a Friday night", grammar: "Did – Irregular verbs" },
      { code: "10B", title: "A perfect weekend", grammar: "Information questions (review)" },
    ],
  },

  essentials2: {
    label: "Essentials 2",
    tier: "basic",
    points: [
      { code: "1A", title: "Vacation time", grammar: "Be (past)" },
      { code: "1B", title: "What was last summer like?", grammar: "How" },
      { code: "2A", title: "A farewell party", grammar: "There was / There were" },
      { code: "2B", title: "Money talks", grammar: "Numbers (1,000...) / Years" },
      { code: "3A", title: "What can I get you?", grammar: "Countable and uncountable nouns / How many / How much" },
      { code: "3B", title: "Cooking", grammar: "A lot of / Lots of / Some / Few / Little / Many / Much" },
      { code: "4A", title: "Do one's share", grammar: "How often / Adverbs of frequency" },
      { code: "4B", title: "City issues", grammar: "Too many / too much" },
      { code: "5A", title: "What were you doing?", grammar: "Past continuous" },
      { code: "5B", title: "Life events", grammar: "When / While" },
      { code: "6A", title: "A doctor's appointment", grammar: "Could (ability)" },
      { code: "6B", title: "Treatments and therapies", grammar: "How old" },
      { code: "7A", title: "Can you help me?", grammar: "Can / Could / May (permission)" },
      { code: "7B", title: "How organized is your home?", grammar: "Can / Could (request) / How + adj/adv / And, but, so" },
      { code: "8A", title: "A blind date", grammar: "Possessive pronouns" },
      { code: "8B", title: "Accessorize it!", grammar: "Plural of nouns" },
      { code: "9A", title: "You are what you read", grammar: "Genitive case / Whose" },
      { code: "9B", title: "Reading vs. technology", grammar: "Enjoy + v.-ing / Like + v.-ing" },
      { code: "10A", title: "Pets", grammar: "Will (predictions)" },
      { code: "10B", title: "Nature", grammar: "Which" },
    ],
  },

  transitions1: {
    label: "Transitions 1",
    tier: "intermediate",
    points: [
      { code: "U1", title: "What's trending now?", grammar: "Tag questions / How + long, far, well" },
      { code: "U2", title: "What's out there?", grammar: "Be + v-ing meaning future / Zero conditional: if (present) + present" },
      { code: "U3", title: "What are you like?", grammar: "Comparatives (as...as) / Comparatives (-er...than)" },
      { code: "U4", title: "Why is networking important?", grammar: "Comparatives (more/less...than) / Used to" },
      { code: "U5", title: "Do you have any vacancies?", grammar: "Should / had better / Directions" },
      { code: "U6", title: "Are you a geek?", grammar: "Going to (past) / Verb-ing as subject" },
      { code: "U7", title: "What do you do?", grammar: "Must / mustn't / have to / Get = become" },
      { code: "U8", title: "Are you ready to move out?", grammar: "Be able to / Some, any, no" },
      { code: "U9", title: "How skillful are you?", grammar: "Present Perfect – ever / already / never / yet" },
      { code: "U10", title: "How are the two of you getting along?", grammar: "Present Perfect – how long / since / for / Verbs + v-ing" },
    ],
  },

  transitions2: {
    label: "Transitions 2",
    tier: "intermediate",
    points: [
      { code: "U1", title: "On the crest of a wave", grammar: "Superlatives" },
      { code: "U2", title: "To watch out for", grammar: "Present perfect – just" },
      { code: "U3", title: "Live and let live", grammar: "Relative pronouns" },
      { code: "U4", title: "Green, yellow or red?", grammar: "First conditional" },
      { code: "U5", title: "Through thick and thin", grammar: "Be supposed to" },
      { code: "U6", title: "Out of hand", grammar: "Present perfect – lately / recently" },
      { code: "U7", title: "The sky is the limit", grammar: "Reflexive pronouns" },
      { code: "U8", title: "Not a tempest in a teapot", grammar: "Present perfect vs. Simple past" },
      { code: "U9", title: "Food for thought", grammar: "Present perfect continuous" },
      { code: "U10", title: "Cross your fingers", grammar: "Second conditional" },
    ],
  },

  fluency1: {
    label: "Fluency 1",
    tier: "advanced",
    points: [
      { code: "U1", title: "Relationships", grammar: "The structure 'a friend of mine' / Present perfect vs. present perfect continuous" },
      { code: "U2", title: "Food", grammar: "Compounds of some, any, no / How long + it take + to...?" },
      { code: "U3", title: "Traveling", grammar: "Superlatives + present perfect / Past perfect" },
      { code: "U4", title: "Sports", grammar: "Negative questions and tag questions / Third conditional" },
      { code: "U5", title: "Fashion", grammar: "Quantifiers / Adjective order" },
      { code: "U6", title: "Technology", grammar: "Subject questions / Modals in the past" },
      { code: "U7", title: "Health", grammar: "Emphatic do, does, did / Wish + simple past" },
      { code: "U8", title: "Time", grammar: "Have / get something + past participle / Verb + object + infinitive" },
      { code: "U9", title: "Consumerism", grammar: "Intensifiers / Double comparatives" },
      { code: "U10", title: "Games", grammar: "Prefixes (un, im, in, ir, dis) / Direct and indirect speech" },
    ],
  },

  fluency2: {
    label: "Fluency 2",
    tier: "advanced",
    points: [
      { code: "U1", title: "Reinvention", grammar: "The use of one / a / an / Indirect speech – changes at a much later time" },
      { code: "U2", title: "Animals", grammar: "Questions in indirect speech / Past perfect continuous" },
      { code: "U3", title: "Regrets", grammar: "So vs. neither / Wish + past perfect" },
      { code: "U4", title: "Learning", grammar: "Verbs with two objects / Indirect questions" },
      { code: "U5", title: "Careers", grammar: "Possessive before -ing forms / Wish + would" },
      { code: "U6", title: "Leisure", grammar: "So vs. such (a/an) / Future perfect" },
      { code: "U7", title: "Art", grammar: "Whose (relative pronoun) / Defining and non-defining relative clauses" },
      { code: "U8", title: "Communication", grammar: "Verbs of belief / Sequence of adverbs" },
      { code: "U9", title: "Crime", grammar: "Verbs of perception + infinitive and gerund / Be used to, get used to" },
      { code: "U10", title: "Caring", grammar: "Uncountable nouns / Whoever, whenever, whichever, wherever, whatever, however" },
    ],
  },

  focus: {
    label: "In Focus Review",
    tier: "advanced",
    points: [
      { code: "C1", title: "Present tenses / Past tenses", grammar: "Present tenses / Past tenses" },
      { code: "C2", title: "Future tenses", grammar: "Future tenses" },
      { code: "C3", title: "Subjunctive", grammar: "Subjunctive" },
      { code: "C4", title: "Conditionals", grammar: "Conditionals (all types)" },
      { code: "C5", title: "Inversion", grammar: "Inversion" },
      { code: "C6", title: "Gerunds and infinitives", grammar: "Gerunds and infinitives" },
      { code: "C7", title: "Relative pronouns", grammar: "Relative pronouns" },
      { code: "C8", title: "Adjectives", grammar: "Adjectives" },
      { code: "C9", title: "Passive voice", grammar: "Passive voice" },
      { code: "C10", title: "Emphatic forms", grammar: "Emphatic forms" },
    ],
  },
};

// Quando o professor não marca nenhum estágio, cai no mapeamento padrão
// por nível — pedido explícito do Pedro: Basic = Essentials 1 e 2,
// Intermediate = Transitions 1 e 2, Advanced = Fluency 1, 2 e Focus.
const LEVEL_DEFAULT_BOOKS = {
  basic: ["essentials1", "essentials2"],
  intermediate: ["transitions1", "transitions2"],
  advanced: ["fluency1", "fluency2", "focus"],
};

// Ordem fixa usada para renderizar os checkboxes de estágio no formulário.
const STAGE_ORDER = [
  "essentials1",
  "essentials2",
  "transitions1",
  "transitions2",
  "fluency1",
  "fluency2",
  "focus",
];

module.exports = { BOOK_CATALOG, LEVEL_DEFAULT_BOOKS, STAGE_ORDER };
