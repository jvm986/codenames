import * as React from 'react';
import axios from 'axios';
import { Settings, SettingsButton, SettingsPanel } from '~/ui/settings';
import Timer from '~/ui/timer';

const defaultFavicon =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA8SURBVHgB7dHBDQAgCAPA1oVkBWdzPR84kW4AD0LCg36bXJqUcLL2eVY/EEwDFQBeEfPnqUpkLmigAvABK38Grs5TfaMAAAAASUVORK5CYII=';
const blueTurnFavicon =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAmSURBVHgB7cxBAQAABATBo5ls6ulEiPt47ASYqJ6VIWUiICD4Ehyi7wKv/xtOewAAAABJRU5ErkJggg==';
const redTurnFavicon =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAmSURBVHgB7cwxAQAACMOwgaL5d4EiELGHoxGQGnsVaIUICAi+BAci2gJQFUhklQAAAABJRU5ErkJggg==';
const greenTurnFavicon =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEklEQVR4nGNgGAWjYBSMAggAAAQQAAFVN1rQAAAAAElFTkSuQmCCiVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGklEQVR4nGP8z0AZYKJQ/6gBowaMGjBoDAAAUD0BH7lEhZ4AAAAASUVORK5CYIKJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIBgAAAB/z/2EAAAASSURBVHicY2AYBaNgFIwCCAAABBAAAVU3WtAAAAAASUVORK5CYII=';
const yellowTurnFavicon =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGklEQVR4nGP8z0AZYKJQ/6gBowaMGjBoDAAAUD0BH7lEhZ4AAAAASUVORK5CYIKJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIBgAAAB/z/2EAAAAaSURBVHicY/zPQBlgolD/qAGjBowaMGgMAABQPQEfuUSFngAAAABJRU5ErkJggolQTkcNChoKAAAADUlIRFIAAAAQAAAAEAgGAAAAH/P/YQAAABJJREFUeJxjYBgFo2AUjAIIAAAEEAABVTda0AAAAABJRU5ErkJggg==';
export class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      game: null,
      mounted: true,
      settings: Settings.load(),
      mode: 'game',
      codemaster: false,
    };
  }

  public extraClasses() {
    var classes = '';
    if (this.state.settings.colorBlind) {
      classes += ' color-blind';
    }
    if (this.state.settings.darkMode) {
      classes += ' dark-mode';
    }
    if (this.state.settings.fullscreen) {
      classes += ' full-screen';
    }
    return classes;
  }

  // Judge if the game is finished, by counting number of teams still in the game
  public gameIsFinished() {
    return !(this.state.game.order.length > 1);
  }

  // After a game has finished, count the scores of each team.
  public getFinalTeamScores() {
    this.state.game.teams.forEach(team => {
      // add one point if there are losers, 0 points if not
      let score = this.state.game.losers.length ? 1 : 0;

      if (this.state.game.losers.includes(team)) {
        this.state.scores[team] = this.state.scores[team] + 0 || 0;
      } else if (this.state.game.winners.includes(team)) {
        let idx = this.state.game.winners.findIndex(team);
        // in game of four, first winner gets 3 points, second 2, third 1
        // in game of three, first winenr gets 2 points, second 1
        // in game of two, winner gets 1 point
        score += (this.state.game.teams.length - (idx + 1));
        this.state.scores[team] = this.state.scores[team] + score || score;
      } else {
        this.state.scores[team] = this.state.scores[team] + score || score;
      }
    });
  }

  public handleKeyDown(e) {
    if (e.keyCode == 27) {
      this.setState({ mode: 'game' });
    }
  }

  public componentDidMount(prevProps, prevState) {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.setDarkMode(prevProps, prevState);
    this.setTurnIndicatorFavicon(prevProps, prevState);
    this.refresh();
  }

  public componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.getElementById('favicon').setAttribute('href', defaultFavicon);
    this.setState({ mounted: false });
  }

  public componentDidUpdate(prevProps, prevState) {
    this.setDarkMode(prevProps, prevState);
    this.setTurnIndicatorFavicon(prevProps, prevState);
  }

  private setDarkMode(prevProps, prevState) {
    if (!prevState?.settings.darkMode && this.state.settings.darkMode) {
      document.body.classList.add('dark-mode');
    }
    if (prevState?.settings.darkMode && !this.state.settings.darkMode) {
      document.body.classList.remove('dark-mode');
    }
  }

  private setTurnIndicatorFavicon(prevProps, prevState) {
    if (
      // TODO: check something else instead of winning team
      prevState?.game?.winning_team !== this.state.game?.winning_team ||
      prevState?.game?.round !== this.state.game?.round ||
      prevState?.game?.state_id !== this.state.game?.state_id
    ) {
      // TODO: make currentTeam() handle this
      if (this.state.game?.winning_team) {
        document.getElementById('favicon').setAttribute('href', defaultFavicon);
      } else {
        document
          .getElementById('favicon')
          .setAttribute(
            'href',
            this.currentTeam() === 'blue' ? blueTurnFavicon :
              this.currentTeam() === 'green' ? greenTurnFavicon :
                this.currentTeam() === 'yellow' ? yellowTurnFavicon :
                  this.currentTeam() === 'red' ? redTurnFavicon :
                    defaultFavicon
          );
      }
    }
  }

  /* Gets info about current score so screen readers can describe how many words
   * remain for each team. */
  private getScoreAriaLabel() {
    let res = 'Scores: ';
    let scores = [];
    this.state.game.order.forEach(team => {
      scores.push(this.remaining(team).toString() + ' ' + team + ' words remaining');
    });
    res += scores.join(', ');
    if (this.state.game.losers.length !== 0) {
      res += '. Losers: ' + this.state.game.losers.join(', ');
    }
    if (this.state.game.winners.length !== 0) {
      res += '. Winners: ' + this.state.game.winners.join(', ');
    }
    res += '. ';
    return res;
  }

  // Determines value of aria-disabled attribute to tell screen readers if word can be clicked.
  private cellDisabled(idx) {
    if (this.state.codemaster && !this.state.settings.spymasterMayGuess) {
      return true;
    } else if (this.state.game.revealed[idx]) {
      return true;
    } else if (this.gameIsFinished()) {
      return true;
    }
    return false;
  }

  // Gets info about word to assist screen readers with describing cell.
  private getCellAriaLabel(idx) {
    let ariaLabel = this.state.game.words[idx].toLowerCase();
    if (
      this.state.codemaster ||
      // TODO: REMOVE WINNING TEAM
      this.state.game.winning_team ||
      this.state.game.revealed[idx]
    ) {
      let wordColor = this.state.game.layout[idx];
      ariaLabel += ', ' + (wordColor === 'black' ? 'assassin' : wordColor);
    }
    ariaLabel +=
      ', ' + (this.state.game.revealed[idx] ? 'revealed word' : 'hidden word');
    ariaLabel += '.';
    return ariaLabel;
  }

  public refresh() {
    if (!this.state.mounted) {
      return;
    }

    let state_id = '';
    if (this.state.game && this.state.game.state_id) {
      state_id = this.state.game.state_id;
    }

    axios
      .post('/game-state', {
        game_id: this.props.gameID,
        state_id: state_id,
      })
      .then(({ data }) => {
        this.setState((oldState) => {
          const stateToUpdate = { game: data };
          if (oldState.game && data.created_at != oldState.game.created_at) {
            stateToUpdate.codemaster = false;
          }
          return stateToUpdate;
        });
      })
      .finally(() => {
        setTimeout(() => {
          this.refresh();
        }, 2000);
      });
  }

  public toggleRole(e, role) {
    e.preventDefault();
    this.setState({ codemaster: role == 'codemaster' });
  }

  public guess(e, idx) {
    e.preventDefault();
    if (this.state.codemaster && !this.state.settings.spymasterMayGuess) {
      return; // ignore if player is the codemaster
    }
    if (this.state.game.revealed[idx]) {
      return; // ignore if already revealed
    }
    if (this.gameIsFinished()) {
      return; // ignore if game is over
    }

    axios
      .post('/guess', {
        game_id: this.state.game.id,
        index: idx,
      })
      .then(({ data }) => {
        this.setState({ game: data });
      });
  }

  public currentTeam() {
    return this.state.game.order[this.state.game.turn_index];
  }

  public remaining(color) {
    var count = 0;
    for (var i = 0; i < this.state.game.revealed.length; i++) {
      if (this.state.game.revealed[i]) {
        continue;
      }
      if (this.state.game.layout[i] == color) {
        count++;
      }
    }
    return count;
  }

  public endTurn() {
    axios
      .post('/end-turn', {
        game_id: this.state.game.id,
        current_round: this.state.game.round,
      })
      .then(({ data }) => {
        this.setState({ game: data });
      });
  }

  public nextGame(e) {
    e.preventDefault();
    // Ask for confirmation when current game hasn't finished
    let allowNextGame =
      this.gameIsFinished() ||
      confirm('Do you really want to start a new game?');
    if (!allowNextGame) {
      return;
    }

    axios
      .post('/next-game', {
        game_id: this.state.game.id,
        word_set: this.state.game.word_set,
        create_new: true,
        number_of_teams: this.state.game.number_of_teams,
        timer_duration_ms: this.state.game.timer_duration_ms,
        enforce_timer: this.state.game.enforce_timer,
      })
      .then(({ data }) => {
        this.setState({ game: data, codemaster: false });
      });
  }

  public toggleSettingsView(e) {
    if (e != null) {
      e.preventDefault();
    }
    if (this.state.mode == 'settings') {
      this.setState({ mode: 'game' });
    } else {
      this.setState({ mode: 'settings' });
    }
  }

  public toggleSetting(e, setting) {
    if (e != null) {
      e.preventDefault();
    }
    const vals = { ...this.state.settings };
    vals[setting] = !vals[setting];
    this.setState({ settings: vals });
    Settings.save(vals);
  }

  render() {
    if (!this.state.game) {
      return <p className="loading">Loading&hellip;</p>;
    }
    if (this.state.mode == 'settings') {
      return (
        <SettingsPanel
          toggleView={(e) => this.toggleSettingsView(e)}
          toggle={(e, setting) => this.toggleSetting(e, setting)}
          values={this.state.settings}
        />
      );
    }

    let status, statusClass;
    if (this.gameIsFinished()) {
      statusClass = "finished"
      status = <span> Winners: {this.state.game.winners.join(", ")}. {this.state.game.losers.length !== 0 ? <div>Loser by Strike: {this.state.game.losers[0]}</div> : ""} </span>
    } else {
      statusClass = this.currentTeam() + '-turn';
      status = this.currentTeam() + "'s turn";
    }

    let endTurnButton;
    if (!this.state.game.winning_team && !this.state.codemaster) {
      endTurnButton = (
        <div id="end-turn-cont">
          <button
            onClick={(e) => this.endTurn(e)}
            id="end-turn-btn"
            aria-label={'End ' + this.currentTeam() + "'s turn"}
          >
            End {this.currentTeam()}&#39;s turn
          </button>
        </div>
      );
    }

    let otherTeam = 'blue';
    if (this.state.game.starting_team == 'blue') {
      otherTeam = 'red';
    }

    let shareLink = null;
    if (!this.state.settings.fullscreen) {
      shareLink = (
        <div id="share">
          Send this link to friends:&nbsp;
          <a className="url" href={window.location.href}>
            {window.location.href}
          </a>
        </div>
      );
    }

    const timer = !!this.state.game.timer_duration_ms && (
      <div id="timer">
        <Timer
          roundStartedAt={this.state.game.round_started_at}
          timerDurationMs={this.state.game.timer_duration_ms}
          handleExpiration={() => {
            this.state.game.enforce_timer && this.endTurn();
          }}
          freezeTimer={!!this.state.game.winning_team}
        />
      </div>
    );

    return (
      <div
        id="game-view"
        className={
          (this.state.codemaster ? 'codemaster' : 'player') +
          this.extraClasses()
        }
      >
        <div id="infoContent">
          {shareLink}
          {timer}
        </div>
        <div id="status-line" className={statusClass}>
          <div
            id="remaining"
            role="img"
            aria-label={this.getScoreAriaLabel()}
          >
            {this.state.game.teams.map((team, idx) => (
              <span>{idx ? " - " : ""}
                <span
                  key={idx}
                  className={
                    team + "-remaining" +
                    (this.state.game.losers.includes(team) ? " loser" : "") +
                    (this.currentTeam() === team ? " active" : "") +
                    (this.state.game.winners.includes(team) ? " winner" : "")
                  }
                >{this.remaining(team)}
                </span>
              </span>
            ))}
          </div>
          <div id="status" className="status-text">
            {status}
          </div>
          {endTurnButton}
        </div>
        <div className={'board ' + statusClass}>
          {this.state.game.words.map((w, idx) => (
            <div
              key={idx}
              className={
                'cell ' +
                this.state.game.layout[idx] +
                ' ' +
                ["two_players", "three_players", "four_players"][parseInt(this.state.game.number_of_teams) - 2] +
                ' ' +
                (this.state.codemaster && !this.state.settings.spymasterMayGuess
                  ? 'disabled '
                  : '') +
                (this.state.game.revealed[idx] ? 'revealed' : 'hidden-word')
              }
              onClick={(e) => this.guess(e, idx, w)}
            >
              <span
                className="word"
                role="button"
                aria-disabled={this.cellDisabled(idx)}
                aria-label={this.getCellAriaLabel(idx)}
              >
                {w}
              </span>
            </div>
          ))}
        </div>
        <form
          id="mode-toggle"
          className={
            this.state.codemaster ? 'codemaster-selected' : 'player-selected'
          }
          role="radiogroup"
        >
          <SettingsButton
            onClick={(e) => {
              this.toggleSettingsView(e);
            }}
          />
          <button
            onClick={(e) => this.toggleRole(e, 'player')}
            className="player"
            role="radio"
            aria-checked={!this.state.codemaster}
          >
            Player
          </button>
          <button
            onClick={(e) => this.toggleRole(e, 'codemaster')}
            className="codemaster"
            role="radio"
            aria-checked={this.state.codemaster}
          >
            Spymaster
          </button>
          <button onClick={(e) => this.nextGame(e)} id="next-game-btn">
            Next game
          </button>
        </form>
        <div id="coffee">
          <a href="https://www.buymeacoffee.com/jbowens" target="_blank">
            Buy the developer a coffee.
          </a>
        </div>
      </div>
    );
  }
}
