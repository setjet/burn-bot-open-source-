// dad jokes: safe for work, unsafe for comedy reputation 😭
const DAD_JOKES = [
  'Why don\'t scientists trust atoms? Because they make up everything.',
  'Why did the scarecrow win an award? He was outstanding in his field.',
  'I used to hate facial hair, but then it grew on me.',
  'Why don\'t eggs tell jokes? They\'d crack each other up.',
  'What do you call a fake noodle? An impasta.',
  'Why did the bicycle fall over? Because it was two-tired.',
  'What do you call a bear with no teeth? A gummy bear.',
  'I told my wife she was drawing her eyebrows too high. She looked surprised.',
  'Why can\'t you give a Elsa a balloon? Because she will let it go.',
  'What do you call a fish without eyes? A fsh.',
  'Why did the coffee file a police report? It got mugged.',
  'What do you call a can opener that doesn\'t work? A can\'t opener.',
  'I\'m reading a book about anti-gravity. It\'s impossible to put down.',
  'Why did the math book look sad? Because it had too many problems.',
  'What do you call a snowman with a suntan? A puddle.'
];

// dark humour bucket — the spreadsheet row labeled 'do not demo' 😭
const DARK_JOKES = [
  'I was digging in the garden and found a chest full of gold coins. I was going to tell my wife, but then I remembered she left me for my best friend.',
  'My grandpa said "Feel my pulse" so I did. Nothing. He said "That\'s because I don\'t have one." He was dead the whole time.',
  'I have a step ladder. I never knew my real ladder.',
  'Today I asked my phone "Siri, why am I still single?" and it opened the front camera.',
  'I was addicted to the hokey pokey but I turned myself around.',
  'I have many jokes about unemployed people. Sadly none of them work.',
  'My wife left me because I’m too insecure. At least that’s what I think. She didn’t say anything when she left.',
  'I told my psychiatrist I keep hearing voices. He said you don’t have a psychiatrist.',
  'I’m on a whiskey diet. I’ve lost three days already.',
  'I have a joke about time travel but you didn’t like it.',
  'I was going to tell a time-travel joke but you didn’t like it.',
  'My ex still misses me. But her aim is getting better.',
  'I have a joke about construction but I’m still working on it.',
  'I used to think I was indecisive. But now I’m not so sure.',
  'I have a joke about chemistry but I don’t think it’ll get a reaction.'
];

// programmer jokes to dilute the existential dread a little 😭
const FUNNY_JOKES = [
  'Why do programmers prefer dark mode? Because light attracts bugs.',
  'What do you call 8 hobbits? A hobbyte.',
  'Why did the function break up with the variable? It had too many arguments.',
  'I would avoid the sushi if I were you. It’s a little fishy.',
  'What do you call a boomerang that doesn’t come back? A stick.',
  'Why don’t skeletons fight each other? They don’t have the guts.',
  'What do you call a pile of cats? A meowtain.',
  'Why did the cookie go to the doctor? It was feeling crumbly.',
  'What do you call a bear in the rain? A drizzly bear.',
  'Why did the tomato turn red? It saw the salad dressing.',
  'What do you call a cow with no legs? Ground beef.',
  'Why can’t you give Elsa a balloon? Because she will let it go.',
  'What do you call a sheep with no legs? A cloud.',
  'Why don’t oysters donate to charity? Because they’re shellfish.',
  'What do you call a can opener that doesn’t work? A can’t opener.'
];

const ALL_JOKES = [...DAD_JOKES, ...DARK_JOKES, ...FUNNY_JOKES];
// one big pool — rng doesn't care about your mood, only your luck 😭

function pickJoke() {
  return ALL_JOKES[Math.floor(Math.random() * ALL_JOKES.length)];
}

module.exports = {
  name: 'joke',
  category: 'fun',
  description: 'Get a random joke (dad, dark humour, or funny).',
  async execute(message, args, { prefix }) {
    const joke = pickJoke();
    return message.reply({ content: joke, allowedMentions: { repliedUser: false } });
  }
};
