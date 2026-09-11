import { ChangeEvent } from 'react';

import { parseCsvFile, parseJsonFile } from '../services/fileImport';
import { FlashcardSet } from '../types';

export const handleJsonImport = (
  e: ChangeEvent<HTMLInputElement>,
  setFlashcardSet: React.Dispatch<React.SetStateAction<FlashcardSet | null>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
): void => {
  const file = e.target.files?.[0];
  if (file === undefined) {
    return;
  }

  const reader = new FileReader();
  reader.onload = (event): void => {
    try {
      const content = event.target?.result as string;
      const flashcardSet = parseJsonFile(content);
      setFlashcardSet(flashcardSet);
    } catch (error) {
      setError('Failed to parse JSON file');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
};

export const handleCsvImport = (
  e: ChangeEvent<HTMLInputElement>,
  setFlashcardSet: React.Dispatch<React.SetStateAction<FlashcardSet | null>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
): void => {
  const file = e.target.files?.[0];
  if (file === undefined) {
    return;
  }

  const reader = new FileReader();
  reader.onload = (event): void => {
    try {
      const content = event.target?.result as string;
      const flashcardSet = parseCsvFile(content, file.name);
      setFlashcardSet(flashcardSet);
    } catch (error) {
      setError('Failed to parse CSV file');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
};
