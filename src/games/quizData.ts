export interface QuizQuestion {
  q: string
  options: [string, string, string, string]
  answer: 'A' | 'B' | 'C' | 'D'
}

export const QUIZ_BANK: QuizQuestion[] = [
  {
    q: 'Qual plataforma lançou Stranger Things?',
    options: ['Netflix', 'Disney+', 'HBO Max', 'Globoplay'],
    answer: 'A',
  },
  {
    q: 'Mickey Mouse pertence a qual estúdio?',
    options: ['Warner', 'Disney', 'Sony', 'Paramount'],
    answer: 'B',
  },
  {
    q: 'Quantos anéis o Senhor dos Anéis menciona no verso famoso?',
    options: ['1', '3', '7', '9'],
    answer: 'A',
  },
  {
    q: 'Em que cidade se passa a maior parte de Friends?',
    options: ['Los Angeles', 'Chicago', 'Nova York', 'Miami'],
    answer: 'C',
  },
  {
    q: 'Qual dessas é uma novela clássica da Globo?',
    options: ['Breaking Bad', 'The Office', 'Avenida Brasil', 'Dark'],
    answer: 'C',
  },
  {
    q: 'O que significa a sigla MCU?',
    options: [
      'Marvel Cinematic Universe',
      'Movie Content Unit',
      'Max Cinema Unlimited',
      'Media Codec Utility',
    ],
    answer: 'A',
  },
  {
    q: 'Qual personagem é um jedi?',
    options: ['Thanos', 'Yoda', 'Voldemort', 'Joker'],
    answer: 'B',
  },
  {
    q: 'Qual rede é famosa por Reality Shows como BBB no Brasil?',
    options: ['HBO', 'Apple TV', 'Globo', 'Paramount+'],
    answer: 'C',
  },
]
