import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

const highScoreFileName = FileSystem.documentDirectory + 'highscore.json';

const loadHighScore = async () => {
    try {
        const highScoreString = await FileSystem.readAsStringAsync(highScoreFileName);
        return JSON.parse(highScoreString).highScore;
    } catch (e) {
        return 0; // Default high score
    }
};

const saveHighScore = async (highScore) => {
    try {
        await FileSystem.writeAsStringAsync(highScoreFileName, JSON.stringify({ highScore }));
    } catch (e) {
        console.error("Failed to save high score", e);
    }
};

const randomArrFunction = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const flipCards = () => {
    const icons = [
        'paw', 'paw',
        'heart', 'heart',
        'tree', 'tree',
        'star', 'star',
        'bell', 'bell',
        'gift', 'gift',
    ];
    return randomArrFunction(icons).map((icon, index) => ({
        id: index,
        symbol: icon,
        isFlipped: false,
    }));
};

const App = () => {
    const [cards, setCards] = useState(flipCards());
    const [selectedCards, setSelectedCards] = useState([]);
    const [matches, setMatches] = useState(0);
    const [winMessage, setWinMessage] = useState(new Animated.Value(0));
    const [gameWon, setGameWon] = useState(false);
    const [timer, setTimer] = useState(0);
    const [timerIsActive, setTimerIsActive] = useState(false);
    const [highScore, setHighScore] = useState(0);

    useEffect(() => {
        const init = async () => {
            const savedHighScore = await loadHighScore();
            setHighScore(savedHighScore);
        };
        init();
    }, []);

    const checkForNewHighScore = () => {
        if (timer < highScore || highScore === 0) {
            setHighScore(timer);
            saveHighScore(timer);
            // Notify user of the new high score
            alert("Congratulations! You Achieved a New High Score!");
        }
    };

    // Timer useEffect
    useEffect(() => {
        let interval = null;
        if (timerIsActive) {
            interval = setInterval(() => {
                setTimer((prevTimer) => prevTimer + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerIsActive]);

    const soundObject = new Audio.Sound();

    const playSound = async () => {
        try {
            await soundObject.loadAsync(require('./assets/sounds/surprise.mp3'));
            await soundObject.playAsync();
            // Your sound is playing!

            // When the sound is done playing, unload it from memory
            await soundObject.unloadAsync();
        } catch (error) {
            // An error occurred!
        }
    };

    const cardClickFunction = (card) => {
        if (!gameWon && selectedCards.length < 2 && !card.isFlipped) {
            if (selectedCards.length === 0 && !timerIsActive) {
                setTimerIsActive(true); // Start the timer on the first card click
            }
            const updatedSelectedCards = [...selectedCards, card];
            const updatedCards = cards.map((c) => c.id === card.id ? { ...c, isFlipped: true } : c);
            setSelectedCards(updatedSelectedCards);
            setCards(updatedCards);

            if (updatedSelectedCards.length === 2) {
                if (updatedSelectedCards[0].symbol === updatedSelectedCards[1].symbol) {
                    setMatches(matches + 1);
                    setSelectedCards([]);

                    // Vibration on successful match
                    Vibration.vibrate();

                    if (matches + 1 === cards.length / 2) {
                        winGameFunction();
                        setGameWon(true);
                    }
                } else {
                    setTimeout(() => {
                        const flippedCards = updatedCards.map((c) => updatedSelectedCards.some((s) => s.id === c.id) ? { ...c, isFlipped: false } : c);
                        setSelectedCards([]);
                        setCards(flippedCards);
                    }, 1000);
                }
            }
        }
    };

    const winGameFunction = () => {
        setGameWon(true);
        setTimerIsActive(false); // Stop the timer when the game is won
        checkForNewHighScore(); // Check if the current score is a new high score
    };

    useEffect(() => {
        if (matches === cards.length / 2) {
            winGameFunction();
        }
    }, [matches]);

    // Reset game function updated to stop the timer and reset it
    const resetGame = () => {
        setCards(flipCards());
        setSelectedCards([]);
        setMatches(0);
        setWinMessage(new Animated.Value(0));
        setGameWon(false);
        // setTimer(0);
        setTimerIsActive(false); // Ensure the timer is stopped
    };

    // Function to manually reset the timer
    const resetTimerManually = () => {
        setTimer(0); // Reset the timer to 0 manually
        if (!gameWon) { // Optionally, stop the timer if the game isn't won
            setTimerIsActive(false);
        }
    };

    const resetHighScoreManually = () => {
        setHighScore(0); // Reset the high score to 0
        saveHighScore(0); // Save the reset high score
    };

    const msg = `Matches: ${matches} / ${cards.length / 2}`;
    const timeMsg = `Time: ${timer} seconds`;

    // State to hold the orientation
    const [orientation, setOrientation] = useState(getOrientation());

    // Function to determine the current orientation of the screen
    function getOrientation() {
        const dim = Dimensions.get('screen');
        return dim.height >= dim.width ? 'portrait' : 'landscape';
    }

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', (e) => {
            setOrientation(getOrientation());
        });

        return () => {
            subscription.remove();
        };
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.header1}>Memory Match Game</Text>
            {/* Display high score and timer */}
            <Text style={styles.timerText}>High Score: {highScore} seconds</Text>
            <Text style={styles.timerText}>Time: {timer} seconds</Text>

            {/* Reset Timer / Reset High Score */}
            <View style={styles.resetButtonsContainer}>
                <TouchableOpacity onPress={resetTimerManually}>
                    <Text style={styles.resetActionText}>Reset Timer</Text>
                </TouchableOpacity>
                <Text style={styles.resetActionText}> / </Text>
                <TouchableOpacity onPress={resetHighScoreManually}>
                    <Text style={styles.resetActionText}>Reset High Score</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.matchText}>Matches: {matches} / {cards.length / 2}</Text>

            {gameWon ? (
                <View style={styles.winMessage}>
                    <View style={styles.winMessageContent}>
                        <Text style={styles.winText}>Congratulations! You Won!</Text>
                    </View>
                    <TouchableOpacity
                        onPress={resetGame}
                        style={styles.restartButton}>
                        <Text style={styles.restartText}>Restart</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.grid}>
                    {cards.map((card) => (
                        <TouchableOpacity
                            key={card.id}
                            style={[styles.card, card.isFlipped && styles.cardFlipped]}
                            onPress={() => cardClickFunction(card)}
                        >
                            {card.isFlipped ? <Icon name={card.symbol} size={40} style={styles.cardIcon} /> : null}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'lightgrey',
    },
    timerText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    header1: {
        fontSize: 36,
        marginBottom: 10,
        color: 'green',
    },

    matchText: {
        fontSize: 18,
        color: 'black',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    card: {
        width: 80,
        height: 80,
        margin: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFD700',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'black',
    },
    cardFlipped: {
        backgroundColor: 'white',
    },
    cardIcon: {
        color: 'blue',
    },
    winMessage: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    winMessageContent: {
        backgroundColor: '#FFD700',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    winText: {
        fontSize: 30,
        color: 'white',
    },
    resetButtonsContainer: {
        flexDirection: 'row', // Align buttons horizontally
        alignItems: 'center', // Center buttons vertically
        justifyContent: 'space-around', // Center buttons horizontally
        marginTop: 10, // Add some margin at the top
        marginBottom: 20, // Add some margin at the bottom
    },
    resetActionText: {
        fontSize: 18,
        color: '#007bff', // Bootstrap's default blue
        fontWeight: 'bold',
    },
    restartText: {
        fontSize: 30, // Larger font size for better visibility
        color: '#FFD700',
        fontWeight: 'bold',
        marginTop: 20, // Margin at the top for spacing
    },
});

export default App;

