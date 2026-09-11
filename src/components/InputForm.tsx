import React, { useState, useEffect, useRef } from 'react';
import { extractFlashcards } from '../services/llmService';
import { fetchWikipediaContent } from '../services/wikipediaService';
import { FlashcardSet, Flashcard } from '../types';
import { getLLMConfig } from '../config';
import { MockModeToggle } from './MockModeToggle';
import { v4 as uuidv4 } from 'uuid';
import '../styles/InputForm.css';

interface InputFormProps {
  setFlashcardSet: React.Dispatch<React.SetStateAction<FlashcardSet | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const InputForm: React.FC<InputFormProps> = ({ setFlashcardSet, setLoading, setError }) => {
  const [isUrlInput, setIsUrlInput] = useState(true);
  const [input, setInput] = useState('');
  const [useMockMode, setUseMockMode] = useState(true);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedSetting = localStorage.getItem('use_mock_mode');
    if (savedSetting) {
      setUseMockMode(savedSetting === 'true');
    }
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!input.trim()) {
      setError('Please enter a Wikipedia URL or text');
      return;
    }

    const config = getLLMConfig();

    if (
      !useMockMode
      && (config.defaultApiKey === undefined || config.defaultApiKey === '' || config.defaultApiKey.trim() === '')
    ) {
      setError('Please set your API key in LLM Settings');
      return;
    }

    setLoading(true);

    try {
      let content = input;
      let source = 'Custom text';

      if (isUrlInput) {
        if (!isValidWikipediaUrl(input)) {
          setError('Please enter a valid Wikipedia URL');
          setLoading(false);
          return;
        }

        const wikiContent = await fetchWikipediaContent(input);
        content = wikiContent.content;
        source = input;
      }

      const flashcards = await extractFlashcards(content, undefined, useMockMode);

      setFlashcardSet({
        title: isUrlInput ? extractTitleFromUrl(input) : 'Custom Text Flashcards',
        source: source,
        cards: flashcards,
        createdAt: new Date()
      });
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  const isValidWikipediaUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes('wikipedia.org') && parsedUrl.pathname.length > 1;
    } catch {
      return false;
    }
  };

  const extractTitleFromUrl = (url: string): string => {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      return lastPart.replace(/_/g, ' ');
    } catch {
      return 'Wikipedia Flashcards';
    }
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (!parsed.title || !parsed.cards || !Array.isArray(parsed.cards)) {
          setError('Invalid JSON file format');
          return;
        }

        const cards: Flashcard[] = parsed.cards.map((card: any) => ({
          id: card.id || uuidv4(),
          question: card.question,
          answer: card.answer
        }));

        setFlashcardSet({
          title: parsed.title,
          source: parsed.source || 'Imported JSON',
          cards,
          createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date()
        });
      } catch (error) {
        setError('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setError('CSV file is empty or invalid');
          return;
        }

        const cards: Flashcard[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const parts: string[] = [];
          let current = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              if (inQuotes && line[j + 1] === '"') {
                current += '"';
                j++;
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
              answer: parts[1].replace(/^"|"$/g, '').replace(/""/g, '"')
            });
          }
        }

        if (cards.length === 0) {
          setError('No valid flashcards found in CSV');
          return;
        }

        setFlashcardSet({
          title: 'Imported CSV Flashcards',
          source: file.name,
          cards,
          createdAt: new Date()
        });
      } catch (error) {
        setError('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="input-form-container">
      <form onSubmit={handleSubmit}>
        <div className="input-type-selector">
          <button
            type="button"
            className={isUrlInput ? 'active' : ''}
            onClick={() => setIsUrlInput(true)}
          >
            Wikipedia URL
          </button>
          <button
            type="button"
            className={!isUrlInput ? 'active' : ''}
            onClick={() => setIsUrlInput(false)}
          >
            Custom Text
          </button>
        </div>

        <div className="import-buttons">
          <button
            type="button"
            className="import-button"
            onClick={() => jsonInputRef.current?.click()}
          >
            Import JSON
          </button>
          <button
            type="button"
            className="import-button"
            onClick={() => csvInputRef.current?.click()}
          >
            Import CSV
          </button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={handleJsonImport}
            style={{ display: 'none' }}
            data-testid="json-input"
          />
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvImport}
            style={{ display: 'none' }}
            data-testid="csv-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="input">
            {isUrlInput ? 'Wikipedia URL' : 'Text to extract flashcards from'}
          </label>
          <textarea
            id="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isUrlInput
                ? 'https://en.wikipedia.org/wiki/Artificial_intelligence'
                : 'Paste your text here...'
            }
            rows={isUrlInput ? 1 : 10}
          />
        </div>

        <MockModeToggle onChange={setUseMockMode} />
        
        <button className="submit-button" type="submit">Generate Flashcards</button>
      </form>
    </div>
  );
};

export default InputForm;
