import * as React from 'react';
import axios from 'axios';
import CustomWords from '~/ui/custom_words';
import WordSetToggle from '~/ui/wordset_toggle';
import TimerSettings from '~/ui/timer_settings';
import OriginalWords from '~/words.json';

export const Lobby = ({ defaultGameID }) => {
  const [newGameName, setNewGameName] = React.useState(defaultGameID);
  const [selectedWordSets, setSelectedWordSets] = React.useState([
    'English (Original)',
  ]);
  const [customWordsText, setCustomWordsText] = React.useState('');
  const [numberOfTeams, setNumberOfTeams] = React.useState(2);
  const [words, setWords] = React.useState({ ...OriginalWords, Custom: [] });
  const [warning, setWarning] = React.useState(null);
  const [timer, setTimer] = React.useState(null);
  const [enforceTimerEnabled, setEnforceTimerEnabled] = React.useState(false);

  let selectedWordCount = selectedWordSets
    .map((l) => words[l].length)
    .reduce((a, cv) => a + cv, 0);

  React.useEffect(() => {
    if (selectedWordCount >= 25) {
      setWarning(null);
    }
  }, [selectedWordSets, customWordsText]);

  function handleNewGame(e) {
    e.preventDefault();
    if (!newGameName) {
      return;
    }

    let combinedWordSet = selectedWordSets
      .map((l) => words[l])
      .reduce((a, w) => a.concat(w), []);

    if (combinedWordSet.length < 25) {
      setWarning('Selected wordsets do not include at least 25 words.');
      return;
    }

    axios
      .post('/next-game', {
        game_id: newGameName,
        word_set: combinedWordSet,
        create_new: false,
        number_of_teams: numberOfTeams,
        timer_duration_ms:
          timer && timer.length ? timer[0] * 60 * 1000 + timer[1] * 1000 : 0,
        enforce_timer: timer && timer.length && enforceTimerEnabled,
      })
      .then(() => {
        const newURL = (document.location.pathname = '/' + newGameName);
        window.location = newURL;
      });
  }

  let toggleWordSet = (wordSet) => {
    let wordSets = [...selectedWordSets];
    let index = wordSets.indexOf(wordSet);

    if (index == -1) {
      wordSets.push(wordSet);
    } else {
      wordSets.splice(index, 1);
    }
    setSelectedWordSets(wordSets);
  };

  let langs = Object.keys(OriginalWords);
  langs.sort();

  return (
    <div id="lobby">
      <div id="available-games">
        <form id="new-game">
          <p className="intro">
            Play Codenames online across multiple devices on a shared board. To
            create a new game or join an existing game, enter a game identifier
            and click 'GO'.
          </p>
          <input
            type="text"
            id="game-name"
            aria-label="game identifier"
            autoFocus
            onChange={(e) => {
              setNewGameName(e.target.value);
            }}
            value={newGameName}
          />

          <button disabled={!newGameName.length} onClick={handleNewGame}>
            Go
          </button>

          {warning !== null ? (
            <div className="warning">{warning}</div>
          ) : (
              <div></div>
            )}

          <div>
            <p>Please select the number of teams:</p>
            <input type="radio" id="two_teams" name="numberOfTeams" value="2" checked="checked" onChange={(e) => {
              setNumberOfTeams(2)
            }} />
            <label for="two_teams">2 Teams</label><br />
            <input type="radio" id="three_teams" name="numberOfTeams" value="3" onChange={(e) => {
              setNumberOfTeams(3)
            }} />
            <label for="three_teams">3 Teams</label><br />
            <input type="radio" id="four_teams" name="numberOfTeams" value="4" onChange={(e) => {
              setNumberOfTeams(4)
            }} />
            <label for="four_teams">4 Teams</label>
            <br />
          </div>

          <TimerSettings
            {...{
              timer,
              setTimer,
              enforceTimerEnabled,
              setEnforceTimerEnabled,
            }}
          />

          <div id="new-game-options">
            <div id="wordsets">
              <p className="instruction">
                You've selected <strong>{selectedWordCount}</strong> words.
              </p>
              <div id="default-wordsets">
                {langs.map((_label) => (
                  <WordSetToggle
                    key={_label}
                    words={words[_label]}
                    label={_label}
                    selected={selectedWordSets.includes(_label)}
                    onToggle={(e) => toggleWordSet(_label)}
                  ></WordSetToggle>
                ))}
              </div>

              <CustomWords
                words={customWordsText}
                onWordChange={(w) => {
                  setCustomWordsText(w);
                  setWords({
                    ...words,
                    Custom: w
                      .trim()
                      .split(',')
                      .map((w) => w.trim())
                      .filter((w) => w.length > 0),
                  });
                }}
                selected={selectedWordSets.includes('Custom')}
                onToggle={(e) => toggleWordSet('Custom')}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
