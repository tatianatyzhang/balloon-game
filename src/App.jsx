import React, { useState, useEffect, useRef } from 'react';
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
  const [timer, setTimer] = useState(60); // Timer starts at 60 seconds
  const [isGameOver, setIsGameOver] = useState(false); // Track if the game is over
  const hasMissedRef = useRef(false);

  // Countdown timer effect
  useEffect(() => {
    if (timer <= 0 || isGameOver) return; // Stop the countdown if the game is over or timer reaches 0

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval); // Stop the timer
          endGame(); // Trigger end of game when time is up
        }
        return prev - 1;
      });
    }, 1000); // Decrease the timer every second

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [timer, isGameOver]);

  // Function to trigger when the game ends
  const endGame = () => {
    setIsGameOver(true); // Mark the game as over
    setMessage(`Time's up!`);
    setScore(prev => prev + timer);
  };

  const generateQuestion = (data) => {
    hasMissedRef.current = false;
    const questionData = data.filter(
      row => row['Vocabulary Category'] === 'Ritual and Religion'
    );
    if (questionData.length === 0) {
      console.error('No relevant question data found.');
      return;
    }
    const randomRow = questionData[Math.floor(Math.random() * questionData.length)];
    setQuestion(randomRow);
    const correctAnswer = randomRow.English;
    const options = generateOptions(data, correctAnswer);
    generateBalloons(options);
  };

  const generateOptions = (data, correctAnswer) => {
    const correctRow = data.find(row => row.English === correctAnswer);
    const category = correctRow?.['Vocabulary Category'];

    const sameCategory = data.filter(row =>
      row.English !== correctAnswer &&
      row['Vocabulary Category'] === category
    );

    const randomDistractors = [];
    const used = new Set();
    while (randomDistractors.length < NUM_OPTIONS - 1 && sameCategory.length) {
      const idx = Math.floor(Math.random() * sameCategory.length);
      const word = sameCategory[idx].English;
      if (!used.has(word)) {
        used.add(word);
        randomDistractors.push(word);
      }
    }

    const allOptions = [correctAnswer, ...randomDistractors];
    return allOptions.sort(() => Math.random() - 0.5);
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
    const newBalloons = options.map((option, index) => {
      const baseX = (index + 1) * gap;
      return {
        id: Date.now() + Math.random() + index,
        x: baseX, // this will now be animated
        baseX,    // store original x
        phase: Math.random() * 2 * Math.PI, // gives a random wave phase
        y: 0,
        speed: 0.3 + Math.random() * 0.1,
        popped: false,
        label: option,
      };
    });
    setBalloons(newBalloons);
  };

  // Update the position of each balloon (simulate floating upward)
  useEffect(() => {
    if (isGameOver) return; // Pause game logic when the game is over

    const updateInterval = setInterval(() => {
      const heightPercent = (130 / window.innerHeight) * 100;
      const time = Date.now(); // Use current time to control movement

      setBalloons(prev => {
        const movedBalloons = prev.map(balloon => {
          // Reduce amplitude of wiggle for smoother movement
          const wiggle = Math.sin((time / 1000) + balloon.phase) * 2; // Reduce amplitude to 2 for smoother effect

          // Gradually apply the wiggle without abrupt movement
          return {
            ...balloon,
            y: balloon.y + balloon.speed,
            x: balloon.baseX + wiggle,  // Smooth wiggle along the x-axis
          };
        });

        const anyHitBottom = movedBalloons.some(
          b => (b.y + heightPercent) >= 100
        );

        if (anyHitBottom && !hasMissedRef.current) {
          hasMissedRef.current = true;
          setScore(prevScore => prevScore - 1);
          setMessage("Too slow!");
          setTimeout(() => {
            setMessage('');
            generateQuestion(vocabulary);
          }, 500);
        }

        // Filter out balloons that have reached the bottom
        return movedBalloons.filter(b => (b.y + heightPercent) < 110);
      });
    }, 50);

    return () => clearInterval(updateInterval); // Cleanup on unmount
  }, [vocabulary, question, isGameOver]);

  const popBalloon = (id) => {
    if (isGameOver) return; // Don't allow popping balloons when the game is over

    const poppedBalloon = balloons.find(b => b.id === id);
    if (!poppedBalloon) return;

    if (poppedBalloon.label === question.English) {
      setScore(prevScore => prevScore + 2); // +2 if they get it correct
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
      }, 500); // Changed from 2000 ms to 500 ms
    } else {
      setScore(prevScore => prevScore - 1);
      setMessage("Incorrect!");
      // Mark the clicked balloon as popped (so it pops/disappears)
      setBalloons(prev =>
        prev.map(b => b.id === id ? { ...b, popped: true } : b)
      );
      // Remove only the popped (incorrect) balloon after the pop animation
      setTimeout(() => {
        setBalloons(prev => prev.filter(b => b.id !== id));
        setMessage('');
      }, 1500);
    }
  };

  const restartGame = () => {
    setScore(0);
    setMessage('');
    setBalloons([]); // Clear balloons
    setTimer(60); // Reset the timer
    setIsGameOver(false); // Reset the game over state
    generateQuestion(vocabulary);
  };

  // Determine button color based on time
  const getTimerButtonColor = () => {
    if (timer > 30) {
      return '#1a732f';
    } else if (timer > 10) {
      return '#ff9407';
    } else {
      return '#dc3545';
    }
  };

  return (
    <div className="game-area">
      <div className="score">Score: {score}</div>

      {/* Timer as a Button */}
      <button
        className="timer-button"
        style={{ backgroundColor: getTimerButtonColor() }}
        disabled={timer <= 0 || isGameOver} // Disable the button when game is over or timer reaches 0
      >
        Time Remaining: {timer} sec
      </button>

      <button className="restart-button" onClick={restartGame}>
        Restart Game
      </button>

      {/* Render balloons only if the game is not over */}
      {!isGameOver && balloons.map(balloon => (
        <Balloon 
          key={balloon.id} 
          balloon={balloon} 
          onClick={() => popBalloon(balloon.id)} 
        />
      ))}

      {/* Results box */}
      {isGameOver && (
        <div className="results-box">
          <h2>Game Over!</h2>
          <p>Final Score: {score}</p>
          <p>Time Remaining: {timer} sec</p>
        </div>
      )}

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