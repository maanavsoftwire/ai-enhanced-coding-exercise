import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import React from 'react';

import InputForm from '../../src/components/InputForm';
import { getLLMConfig } from '../../src/config';
import { extractFlashcards } from '../../src/services/llmService';
import { fetchWikipediaContent } from '../../src/services/wikipediaService';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

jest.mock('../../src/services/llmService', () => ({
  extractFlashcards: jest.fn(),
}));

jest.mock('../../src/services/wikipediaService', () => ({
  fetchWikipediaContent: jest.fn(),
}));

jest.mock('../../src/config', () => ({
  getLLMConfig: jest.fn().mockReturnValue({
    baseUrl: 'http://test-api.com',
    model: 'test-model',
    defaultApiKey: 'default-test-key',
  }),
}));

const mockExtractFlashcards = extractFlashcards as jest.MockedFunction<typeof extractFlashcards>;
const mockFetchWikipediaContent = fetchWikipediaContent as jest.MockedFunction<typeof fetchWikipediaContent>;

describe('InputForm Component', () => {
  const mockSetFlashcardSet = jest.fn();
  const mockSetLoading = jest.fn();
  const mockSetError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders input form with default elements', () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    expect(screen.getByRole('button', { name: 'Wikipedia URL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Flashcards' })).toBeInTheDocument();
    expect(screen.getByText('🚀 Fast Mock Mode')).toBeInTheDocument();
  });

  test('switches between URL and text input modes', () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    const textModeButton = screen.getByRole('button', { name: 'Custom Text' });
    fireEvent.click(textModeButton);

    expect(screen.getByRole('button', { name: 'Custom Text' })).toHaveClass('active');
    expect(screen.getByPlaceholderText('Paste your text here...')).toBeInTheDocument();

    const urlModeButton = screen.getByRole('button', { name: 'Wikipedia URL' });
    fireEvent.click(urlModeButton);

    expect(screen.getByRole('button', { name: 'Wikipedia URL' })).toHaveClass('active');
    const wikiPlaceholder = 'https://en.wikipedia.org/wiki/Artificial_intelligence';
    expect(screen.getByPlaceholderText(wikiPlaceholder)).toBeInTheDocument();
  });

  test('shows error when submitting without input', () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    expect(mockSetError).toHaveBeenCalledWith('Please enter a Wikipedia URL or text');
  });

  test('shows error when API key is missing in config', () => {
    (getLLMConfig as jest.Mock).mockReturnValueOnce({
      baseUrl: 'http://test-api.com',
      model: 'test-model',
      defaultApiKey: '',
    });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    const inputField = screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence');
    fireEvent.change(inputField, { target: { value: 'https://en.wikipedia.org/wiki/React_(JavaScript_library)' } });

    fireEvent.click(screen.getByRole('checkbox'));

    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    expect(mockSetError).toHaveBeenCalledWith('Please set your API key in LLM Settings');
  });

  test('processes Wikipedia URL input correctly', async () => {
    const mockWikiContent = {
      title: 'React',
      content: 'React is a JavaScript library for building user interfaces.',
    };

    const mockFlashcards = [
      { id: '1', question: 'What is React?', answer: 'A JavaScript library for building user interfaces.' },
    ];

    mockFetchWikipediaContent.mockResolvedValue(mockWikiContent);
    mockExtractFlashcards.mockResolvedValue(mockFlashcards);

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    const urlInput = screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence');
    fireEvent.change(urlInput, { target: { value: 'https://en.wikipedia.org/wiki/React_(JavaScript_library)' } });

    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    expect(mockSetLoading).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(mockFetchWikipediaContent).toHaveBeenCalledWith(
        'https://en.wikipedia.org/wiki/React_(JavaScript_library)'
      );
      expect(mockExtractFlashcards).toHaveBeenCalledWith(mockWikiContent.content, undefined, expect.any(Boolean));
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        source: 'https://en.wikipedia.org/wiki/React_(JavaScript_library)',
        cards: mockFlashcards,
      }));
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  test('processes custom text input correctly', async () => {
    const mockFlashcards = [
      { id: '1', question: 'What is TypeScript?', answer: 'A superset of JavaScript that adds static typing.' },
    ];

    mockExtractFlashcards.mockResolvedValue(mockFlashcards);

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    // Switch to custom text mode
    const textModeButton = screen.getByRole('button', { name: 'Custom Text' });
    fireEvent.click(textModeButton);

    // Enter custom text
    const textInput = screen.getByPlaceholderText('Paste your text here...');
    fireEvent.change(textInput, { target: { value: 'TypeScript is a superset of JavaScript that adds static typing.' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    expect(mockSetLoading).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(mockFetchWikipediaContent).not.toHaveBeenCalled();
      expect(mockExtractFlashcards).toHaveBeenCalledWith(
        'TypeScript is a superset of JavaScript that adds static typing.',
        undefined,
        expect.any(Boolean),
      );
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Custom Text Flashcards',
        source: 'Custom text',
        cards: mockFlashcards,
      }));
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  test('validates Wikipedia URL correctly', () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    // Enter invalid URL
    const wikiPlaceholder = 'https://en.wikipedia.org/wiki/Artificial_intelligence';
    const urlInput = screen.getByPlaceholderText(wikiPlaceholder);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/not-wikipedia' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    expect(mockSetError).toHaveBeenCalledWith('Please enter a valid Wikipedia URL');
    expect(mockSetLoading).toHaveBeenCalledWith(true);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  test('extracts title from Wikipedia URL correctly', async () => {
    const mockWikiContent = {
      title: 'Artificial Intelligence',
      content: 'AI content here',
    };

    const mockFlashcards = [
      { id: '1', question: 'What is AI?', answer: 'Artificial Intelligence' },
    ];

    mockFetchWikipediaContent.mockResolvedValue(mockWikiContent);
    mockExtractFlashcards.mockResolvedValue(mockFlashcards);

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    // Enter URL with underscores that should be converted to spaces in title
    const urlInput = screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence');
    fireEvent.change(urlInput, { target: { value: 'https://en.wikipedia.org/wiki/Artificial_intelligence' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Artificial intelligence', // Underscores replaced with spaces
        source: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
      }));
    });
  });

  test('handles API errors correctly', async () => {
    // Mock the extractFlashcards function to throw an error
    mockExtractFlashcards.mockRejectedValue(new Error('API error'));

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    // Enter valid URL
    const urlInput = screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence');
    fireEvent.change(urlInput, { target: { value: 'https://en.wikipedia.org/wiki/React_(JavaScript_library)' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Error: API error');
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  test('handles Wikipedia fetch errors correctly', async () => {
    // Mock the fetchWikipediaContent function to throw an error
    mockFetchWikipediaContent.mockRejectedValue(new Error('Wikipedia API error'));

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    // Enter valid URL
    const urlInput = screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence');
    fireEvent.change(urlInput, { target: { value: 'https://en.wikipedia.org/wiki/React_(JavaScript_library)' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Error: Wikipedia API error');
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  test('passes mock mode setting to extractFlashcards', async () => {
    const mockWikiContent = {
      title: 'React',
      content: 'React content',
    };

    const mockFlashcards = [{ id: '1', question: 'Q', answer: 'A' }];

    mockFetchWikipediaContent.mockResolvedValue(mockWikiContent);
    mockExtractFlashcards.mockResolvedValue(mockFlashcards);

    // Mock localStorage for mock mode setting
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue('true'),
      setItem: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    // Enter URL
    const urlInput = screen.getByPlaceholderText('https://en.wikipedia.org/wiki/Artificial_intelligence');
    fireEvent.change(urlInput, { target: { value: 'https://en.wikipedia.org/wiki/Test' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Generate Flashcards' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Verify that mock mode (true) was passed to extractFlashcards
      expect(mockExtractFlashcards).toHaveBeenCalledWith(mockWikiContent.content, undefined, true);
    });
  });

  test('renders import buttons', () => {
    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    expect(screen.getByRole('button', { name: 'Import JSON' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeInTheDocument();
  });

  test('handles JSON file import', async () => {
    const mockJsonContent = {
      title: 'Test Flashcards',
      source: 'Test Source',
      cards: [
        { question: 'Question 1', answer: 'Answer 1' },
        { question: 'Question 2', answer: 'Answer 2' },
      ],
      createdAt: new Date().toISOString(),
    };

    const file = new File([JSON.stringify(mockJsonContent)], 'test.json', { type: 'application/json' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    const jsonInput = screen.getByTestId('json-input') as HTMLInputElement;
    fireEvent.change(jsonInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Flashcards',
          source: 'Test Source',
          cards: expect.arrayContaining([
            expect.objectContaining({ question: 'Question 1', answer: 'Answer 1' }),
            expect.objectContaining({ question: 'Question 2', answer: 'Answer 2' }),
          ]),
        }),
      );
    });
  });

  test('handles CSV file import', async () => {
    const csvContent = 'Question,Answer\n"Question 1","Answer 1"\n"Question 2","Answer 2"';
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    const csvInput = screen.getByTestId('csv-input') as HTMLInputElement;
    fireEvent.change(csvInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockSetFlashcardSet).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Imported CSV Flashcards',
          source: 'test.csv',
          cards: expect.arrayContaining([
            expect.objectContaining({ question: 'Question 1', answer: 'Answer 1' }),
            expect.objectContaining({ question: 'Question 2', answer: 'Answer 2' }),
          ]),
        }),
      );
    });
  });

  test('handles invalid JSON file', async () => {
    const file = new File(['invalid json'], 'test.json', { type: 'application/json' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    const jsonInput = screen.getByTestId('json-input') as HTMLInputElement;
    fireEvent.change(jsonInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Failed to parse JSON file');
    });
  });

  test('handles invalid CSV file', async () => {
    const file = new File(['invalid,csv'], 'test.csv', { type: 'text/csv' });

    render(
      <InputForm
        setFlashcardSet={mockSetFlashcardSet}
        setLoading={mockSetLoading}
        setError={mockSetError}
      />,
    );

    const csvInput = screen.getByTestId('csv-input') as HTMLInputElement;
    fireEvent.change(csvInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Failed to parse CSV file');
    });
  });
});
