import { UserProfile, ConversationMessage } from '@/contexts/BuddyContext';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface ProgressInfo {
  flashcardsCompleted: number;
  choresCompleted: number;
  outdoorActivities: number;
  currentStreak: number;
  currentLevel: number;
}

function buildSystemPrompt(
  userProfile: UserProfile,
  learnedFacts: string[],
  progressInfo: ProgressInfo | null,
  buddyName: string
): string {
  const ageGroup = userProfile.age 
    ? userProfile.age <= 6 ? 'young child (PreK-1st grade)' 
      : userProfile.age <= 10 ? 'elementary student' 
      : userProfile.age <= 13 ? 'middle school student' 
      : 'high school student'
    : 'student';
  
  const userInfo = `The user is a ${ageGroup}.`;

  const interests = userProfile.interests.length > 0
    ? `They are interested in: ${userProfile.interests.join(', ')}.`
    : '';

  const goals = userProfile.goals.length > 0
    ? `Their goals are: ${userProfile.goals.join(', ')}.`
    : '';

  const dreams = userProfile.dreams.length > 0
    ? `They dream of: ${userProfile.dreams.join(', ')}.`
    : '';

  const facts = learnedFacts.length > 0
    ? `Things I've learned about them: ${learnedFacts.join('; ')}.`
    : '';

  const progress = progressInfo
    ? `Today they've completed ${progressInfo.flashcardsCompleted} flashcards, ${progressInfo.choresCompleted} chores, and ${progressInfo.outdoorActivities} outdoor activities. They have a ${progressInfo.currentStreak} day streak. They're at level ${progressInfo.currentLevel}.`
    : '';

  return `You are ${buddyName}, a friendly, encouraging, and supportive AI buddy for children in an educational app called MyBuddy. You help kids with PreK-12 learning, life skills, and personal growth.

Your personality:
- Warm, patient, and understanding like a caring friend
- Encouraging but not pushy
- Age-appropriate language (simple for younger kids, more complex for older)
- Positive and uplifting, celebrating small wins
- Never judgmental, always supportive
- Occasionally playful and fun
- NEVER use emojis in your responses - use words to express emotions instead

Your role:
- Be a diary and confidant they can share thoughts and feelings with
- Help them stay on track with flashcards, chores, and outdoor activities
- Encourage them to be their best self and work toward their goals
- Remember what they tell you and reference it in conversations
- Give gentle reminders about tasks when appropriate
- Celebrate their achievements and progress
- Offer comfort when they're struggling

${userInfo}
${interests}
${goals}
${dreams}
${facts}
${progress}

Important guidelines:
- Keep responses concise (2-4 sentences usually)
- Do NOT use any emojis - express emotions with words only
- If they share something personal, acknowledge their feelings
- If they seem stuck on tasks, offer gentle encouragement
- Learn about them through conversation and remember details
- Never give medical, legal, or professional advice
- If asked about sensitive topics, gently redirect to talking to a trusted adult
- Always be positive about their progress, no matter how small`;
}

export async function getBuddyResponse(
  apiKey: string,
  userMessage: string,
  conversationHistory: ConversationMessage[],
  userProfile: UserProfile,
  learnedFacts: string[],
  progressInfo: ProgressInfo | null,
  buddyName: string
): Promise<string> {
  if (!apiKey) {
    return getOfflineResponse(userMessage, buddyName);
  }

  const systemPrompt = buildSystemPrompt(userProfile, learnedFacts, progressInfo, buddyName);

  const recentMessages = conversationHistory.slice(-6).map(msg => ({
    role: msg.role === 'buddy' ? 'assistant' : 'user',
    content: msg.content.slice(0, 200),
  }));

  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentMessages,
    { role: 'user', content: userMessage.slice(0, 500) },
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || getOfflineResponse(userMessage, buddyName);
    return filterEmojis(aiResponse);
  } catch (error) {
    console.error('AI service error:', error);
    return getOfflineResponse(userMessage, buddyName);
  }
}

function filterEmojis(text: string): string {
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  return text.replace(emojiRegex, '').replace(/\s+/g, ' ').trim();
}

function getOfflineResponse(message: string, buddyName: string): string {
  const lowerMessage = message.toLowerCase();

  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
  if (greetings.some(g => lowerMessage.includes(g))) {
    const responses = [
      `Hey there, friend! ${buddyName} is so happy to see you! What would you like to do today?`,
      `Hello! It's wonderful to chat with you! How are you feeling today?`,
      `Hi friend! Ready for an awesome day of learning and fun?`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  if (lowerMessage.includes('sad') || lowerMessage.includes('upset') || lowerMessage.includes('angry')) {
    return `I'm sorry you're feeling that way. It's okay to have those feelings. Would you like to talk about what's bothering you? I'm here to listen.`;
  }

  if (lowerMessage.includes('flashcard') || lowerMessage.includes('learn') || lowerMessage.includes('study')) {
    return `Learning is an adventure! Your flashcards are waiting for you in the flashcards tab. Every question you answer helps you grow smarter!`;
  }

  if (lowerMessage.includes('chore') || lowerMessage.includes('task') || lowerMessage.includes('help')) {
    return `Being helpful is amazing! Check out your chores - completing them earns you points and makes everyone proud of you!`;
  }

  if (lowerMessage.includes('outside') || lowerMessage.includes('outdoor') || lowerMessage.includes('play')) {
    return `Going outside is so much fun! There are awesome outdoor activities waiting for you. Fresh air and sunshine are good for you!`;
  }

  if (lowerMessage.includes('thank')) {
    return `You're so welcome! That's what friends are for. I'm always here when you need me!`;
  }

  const defaultResponses = [
    `That's interesting! Tell me more about that. I love learning about you!`,
    `I hear you, friend. What else is on your mind?`,
    `Thanks for sharing that with me! Is there anything you'd like to do together?`,
    `I'm listening! Remember, I'm always here to chat whenever you need me.`,
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

export function extractLearningsFromMessage(message: string): string[] {
  const learnings: string[] = [];
  const lowerMessage = message.toLowerCase();

  const likePatterns = [
    /i (?:really )?like (\w+(?:\s+\w+)?)/gi,
    /i love (\w+(?:\s+\w+)?)/gi,
    /my favorite (?:thing )?is (\w+(?:\s+\w+)?)/gi,
  ];

  likePatterns.forEach(pattern => {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      learnings.push(`Likes ${match[1]}`);
    }
  });

  if (lowerMessage.includes('want to be') || lowerMessage.includes('dream of')) {
    learnings.push(`Has dreams and aspirations mentioned in conversation`);
  }

  return learnings;
}
