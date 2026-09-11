import { v4 as uuidv4 } from 'uuid';

import { Flashcard, FlashcardSet } from '../types';

interface JsonFlashcardData {
  title: string;
  source?: string;
  cards: Array<{
    question: string;
    answer: string;
    id?: string;
  }>;
  createdAt?: string;
}

export const parseJsonFile = (content: string): FlashcardSet => {
  const parsed = JSON.parse(content) as JsonFlashcardData;

  if (parsed.title === undefined || parsed.title === null || parsed.title === '') {
    throw new Error('Invalid JSON file format');
  }

  if (parsed.cards === undefined || !Array.isArray(parsed.cards)) {
    throw new Error('Invalid JSON file format');
  }

  const cards: Flashcard[] = parsed.cards.map((card) => ({
    id: card.id !== undefined ? card.id : uuidv4(),
    question: card.question,
    answer: card.answer,
  }));

  return {
    title: parsed.title,
    source: parsed.source !== undefined && parsed.source !== '' ? parsed.source : 'Imported JSON',
    cards,
    createdAt: parsed.createdAt !== undefined ? new Date(parsed.createdAt) : new Date(),
  };
};

export const parseCsvFile = (content: string, filename: string): FlashcardSet => {
  const lines = content.split('\n').filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  const cards: Flashcard[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j += 1) {
      const char = line[j];
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);

    if (parts.length >= 2) {
      cards.push({
        id: uuidv4(),
        question: parts[0].replace(/^"|"$/g, '').replace(/""/g, '"'),
        answer: parts[1].replace(/^"|"$/g, '').replace(/""/g, '"'),
      });
    }
  }

  if (cards.length === 0) {
    throw new Error('No valid flashcards found in CSV');
  }

  return {
    title: 'Imported CSV Flashcards',
    source: filename,
    cards,
    createdAt: new Date(),
  };
};
