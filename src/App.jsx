import React, { useState, useEffect } from 'react';
import Balloon from './Balloon';
import Papa from 'papaparse';
import './App.css';

const NUM_OPTIONS = 5; // Number of options shown (including the correct answer)

function App() {
  const [balloons, setBalloons] = useState([]);
  const [vocabulary, setVocabulary] = useState([]); // To store CSV data
  const [question, setQuestion] = useState(null);
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(0);
  const [firstAttempt, setFirstAttempt] = useState(true);

  const generateQuestion = (data) => {
    const questionData = data.filter(
      row => row['Vocabulary Category'] === 'Ritual and Religion'
    );
    if (questionData.length === 0) {
      console.error('No relevant question data found.');
      return;
    }
    setFirstAttempt(true);
    // Choose a random row for the question
    const randomRow = questionData[Math.floor(Math.random() * questionData.length)];
    setQuestion(randomRow);
    const correctAnswer = randomRow.English;
    const options = generateOptions(data, correctAnswer);
    generateBalloons(options);
  };

  const generateOptions = (data, correctAnswer) => {
    // Get all English words excluding the correct one
    const distractors = data.filter(row => row.English !== correctAnswer)
                             .map(row => row.English);
    let randomDistractors = [];
    for (let i = 0; i < NUM_OPTIONS - 1; i++) {
      const randomIndex = Math.floor(Math.random() * distractors.length);
      randomDistractors.push(distractors[randomIndex]);
    }
    // Combine and shuffle options
    let allOptions = [correctAnswer, ...randomDistractors].sort(() => Math.random() - 0.5);
    return allOptions;
  };

  useEffect(() => {
    Papa.parse('/vocab_list.csv', {
      header: true,
      download: true,
      complete: (results) => {
        setVocabulary(results.data);
        generateQuestion(results.data);
      },
    });
  }, []);

  const generateBalloons = (options) => {
    const gap = 100 / (options.length + 1);
    const newBalloons = options.map((option, index) => ({
      id: Date.now() + Math.random() + index,
      x: (index + 1) * gap,
      y: 100,
      popped: false,
      label: option,
    }));
    setBalloons(newBalloons);
  };

  // Update the position of each balloon (simulate floating upward)
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setBalloons(prev => {
        const updatedBalloons = prev
          .map(balloon => ({ ...balloon, y: balloon.y - 0.4 }))
          .filter(balloon => balloon.y > -10);
        
        // If no balloons are left on screen, generate a new question.
        if (updatedBalloons.length === 0) {
          generateQuestion(vocabulary);
        }
        return updatedBalloons;
      });
    }, 50);
    return () => clearInterval(updateInterval);
  }, [vocabulary]);  

  const popBalloon = (id) => {
    const poppedBalloon = balloons.find(b => b.id === id);
    if (!poppedBalloon) return;
  
    if (poppedBalloon.label === question.English) {
      if (firstAttempt) {
        setScore(prevScore => prevScore + 1);
      }
      setMessage("Correct!");
      setBalloons(prev =>
        prev.map(b => b.id === id ? { ...b, popped: true } : b)
      );
      setTimeout(() => {
        setBalloons(prev => prev.filter(b => b.id !== id));
      }, 300);
    
      // After a short delay, clear message and generate a new question
      setTimeout(() => {
        setMessage('');
        generateQuestion(vocabulary);
      }, 2000);
    } else {
      setFirstAttempt(false);
      setMessage("Incorrect!");
      // Mark the clicked balloon as popped (so it pops/disappears)
      setBalloons(prev =>
        prev.map(b => b.id === id ? { ...b, popped: true } : b)
      );
      // Remove only the popped (incorrect) balloon after the pop animation
      setTimeout(() => {
        setBalloons(prev => prev.filter(b => b.id !== id));
        // Optionally, you could clear the message here or keep it until the user eventually pops the correct option.
        setMessage('');
      }, 1500);
    }
  };

  const restartGame = () => {
    setScore(0);
    setMessage('');
    setBalloons([]);
    generateQuestion(vocabulary);
  };

  return (
    <div className="game-area">
      <div className="score">Score: {score}</div>
      <button className="restart-button" onClick={restartGame}>
        Restart Game
      </button>
      {balloons.map(balloon => (
        <Balloon 
          key={balloon.id} 
          balloon={balloon} 
          onClick={() => popBalloon(balloon.id)} 
        />
      ))}
      {message && <div className="message">{message}</div>}
      {question && (
        <div className="question">
          <h1>{question.Syriac}</h1>
        </div>
      )}
    </div>
  );
}

export default App;