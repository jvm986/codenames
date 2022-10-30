package codenames

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"time"
)

type Team int

const (
	Neutral Team = iota
	Red
	Blue
	Green 
	Yellow
	Black
)

func (t Team) String() string {
	switch t {
	case Red:
		return "red"
	case Blue:
		return "blue"
	case Green:
		return "green"
	case Yellow:
		return "yellow"
	case Black:
		return "black"
	default:
		return "neutral"
	}
}

func (t *Team) UnmarshalJSON(b []byte) error {
	var s string
	err := json.Unmarshal(b, &s)
	if err != nil {
		return err
	}

	switch s {
	case "red":
		*t = Red
	case "blue":
		*t = Blue
	case "green":
		*t = Green
	case "yellow":
		*t = Yellow
	case "black":
		*t = Black
	default:
		*t = Neutral
	}
	return nil
}

func (t Team) MarshalJSON() ([]byte, error) {
	return json.Marshal(t.String())
}

func (t Team) Repeat(n int) []Team {
	s := make([]Team, n)
	for i := 0; i < n; i++ {
		s[i] = t
	}
	return s
}

// GameState encapsulates enough data to reconstruct
// a Game's state. It's used to recreate games after
// a process restart.
type GameState struct {
	Seed      int64    `json:"seed"`
	PermIndex int      `json:"perm_index"`
	Round        int      `json:"round"`      // the round
	TurnIndex    int      `json:"turn_index"` // the index of the turn: can be used to determine which team's turn is next
	Revealed  []bool   `json:"revealed"`
	WordSet   []string `json:"word_set"`
	WordsPerGame int      `json:"words_per_game"`
}

func (gs GameState) anyRevealed() bool {
	var revealed bool
	for _, r := range gs.Revealed {
		revealed = revealed || r
	}
	return revealed
}

func randomState(words []string, wordsPerGame int) GameState {
	return GameState{
		Seed:      rand.Int63(),
		PermIndex: 0,
		Round:     0,
		TurnIndex:    0,
		Revealed:  make([]bool, wordsPerGame),
		WordSet:   words,
		WordsPerGame: wordsPerGame,
	}
}

// nextGameState returns a new GameState for the next game.
func nextGameState(state GameState) GameState {
	state.PermIndex = state.PermIndex + state.WordsPerGame
	if state.PermIndex+state.WordsPerGame >= len(state.WordSet) {
		state.Seed = rand.Int63()
		state.PermIndex = 0
	}
	state.Revealed = make([]bool, state.WordsPerGame)
	state.Round = 0
	state.TurnIndex = 0
	return state
}

type Game struct {
	GameState
	ID             string    `json:"id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	//
	StartingTeam   Team      `json:"starting_team"`
	//
	WinningTeam    *Team     `json:"winning_team,omitempty"`
	Words          []string  `json:"words"`
	Layout         []Team    `json:"layout"`
	RoundStartedAt time.Time `json:"round_started_at,omitempty"`
	Teams 		   []Team	 `json:"teams"`
	Order          []Team    `json:"order"`    // the order of teams currently still in the game
	Winners        []Team    `json:"winners"` 		// the list of winning teams, in order
	Losers         []Team    `json:"losers"`        // list of teams, that haven't won, but are out, e.g. by hitting the black field
	GameOptions
}

type GameOptions struct {
	TimerDurationMS int64 `json:"timer_duration_ms,omitempty"`
	EnforceTimer    bool  `json:"enforce_timer,omitempty"`
	NumberOfTeams   int64 `json:"number_of_teams,omitempty"`
}

func (g *Game) StateID() string {
	return fmt.Sprintf("%019d", g.UpdatedAt.UnixNano())
}

func (g *Game) checkWinningCondition() {
	if len(g.Order) < 2 {
		return
	}
	var redRemaining, blueRemaining, greenRemaining, yellowRemaining bool
	for i, t := range g.Layout {
		if g.Revealed[i] {
			continue
		}
		switch t {
		case Red:
			redRemaining = true
		case Blue:
			blueRemaining = true
		case Green:
			greenRemaining = true
		case Yellow:
			yellowRemaining = true
		}
	}

	// Although the slices of Winners and Nonwinners are appended
	// together, the order in both lists sustains.
	// Teams that've already won will come before teams that might
	// win in the current turn.
	allTeams := g.Winners
	allTeams = append(allTeams, g.Order...)
	newOrder := []Team{}
	newWinners := []Team{}

	for _, itemCopy := range allTeams {
		switch itemCopy {
		case Red:
			if redRemaining {
				newOrder = append(newOrder, Red)
			} else {
				newWinners = append(newWinners, Red)
			}
			break
		case Blue:
			if blueRemaining {
				newOrder = append(newOrder, Blue)
			} else {
				newWinners = append(newWinners, Blue)
			}
			break
		case Green:
			if greenRemaining {
				newOrder = append(newOrder, Green)
			} else {
				newWinners = append(newWinners, Green)
			}
			break
		case Yellow:
			if yellowRemaining {
				newOrder = append(newOrder, Yellow)
			} else {
				newWinners = append(newWinners, Yellow)
			}
			break
		}
	}
	g.Order = newOrder
	g.Winners = newWinners
}

func nextTurn(g *Game) error {
	g.Round = g.Round + 1
	if (g.TurnIndex < len(g.Order)) {
		g.TurnIndex = (g.TurnIndex + 1) % len(g.Order)
	} else {
		// Edge case g.TurnIndex == len(g.Order): Black was hit, turn index would be (3 + 1) % 4 = 1 instead of 0
		g.TurnIndex = 0
	}
	g.RoundStartedAt = time.Now()
	return nil
}

func (g *Game) Guess(idx int) error {
	if idx > len(g.Layout) || idx < 0 {
		return fmt.Errorf("index %d is invalid", idx)
	}
	if g.Revealed[idx] {
		// This causes errors on large fields
		// return errors.New("cell has already been revealed")
	}

	oldOrderLength := len(g.Order)

	g.UpdatedAt = time.Now()
	g.Revealed[idx] = true

	if g.Layout[idx] == Black {
		loser := g.Order[g.TurnIndex]
		g.Losers = append(g.Losers, loser)
		newOrder := []Team{}

		for _, stillInGame := range g.Order {
			if stillInGame != loser {
				newOrder = append(newOrder, stillInGame)
			}
		}

		g.Order = newOrder
		nextTurn(g)

		//winners := g.currentTeam().Other()
		//g.WinningTeam = &winners
		return nil
	}

	g.checkWinningCondition()

	if (g.Layout[idx] != g.currentTeam()) || (oldOrderLength != len(g.Order)) {
		nextTurn(g)
	}

	return nil
}

func (g *Game) currentTeam() Team {
	return g.Order[g.TurnIndex]
}

func newGame(id string, state GameState, opts GameOptions) *Game {
	// consistent randomness across games with the same seed
	seedRnd := rand.New(rand.NewSource(state.Seed))
	// distinct randomness across games with same seed
	randRnd := rand.New(rand.NewSource(state.Seed * int64(state.PermIndex+1)))

	state.WordsPerGame = []int{25, 36, 49}[opts.NumberOfTeams-2]

	// basic order of teams, depending on number of teams
	order := make([]Team, 0, opts.NumberOfTeams)
	teams := make([]Team, 0, opts.NumberOfTeams)
	for i:=0; i<int(opts.NumberOfTeams); i++ {
		order = append(order, []Team{Red, Blue, Green, Yellow}[i])
	}

	// shuffle the order if teams
	for i:=0; i<5; i++ {
		a := randRnd.Intn(5) % int(opts.NumberOfTeams)
		b := randRnd.Intn(5) % int(opts.NumberOfTeams)
		order[a], order[b] = order[b], order[a]
	}

	for i:=0; i<int(opts.NumberOfTeams); i++ {
		teams = append(teams, order[i])
	}

	game := &Game{
		ID:             id,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
		//StartingTeam:   Team(randRnd.Intn(2)) + Red,
		Teams:			teams, 
		Order:			order,
		Winners: 		make([]Team, 0, opts.NumberOfTeams - 1),
		Losers: 		make([]Team, 0, 1), // Currently only one team can hit the black field
		Words:          make([]string, 0, state.WordsPerGame),
		Layout:         make([]Team, 0, state.WordsPerGame),
		GameState:      state,
		RoundStartedAt: time.Now(),
		GameOptions:    opts,
	}

	// Pick the next `wordsPerGame` words from the
	// randomly generated permutation
	perm := seedRnd.Perm(len(state.WordSet))
	permIndex := state.PermIndex
	for _, i := range perm[permIndex : permIndex+state.WordsPerGame] {
		w := state.WordSet[perm[i]]
		game.Words = append(game.Words, w)
	}

	// Pick a random permutation of team assignments.
	var teamAssignments []Team
	switch opts.NumberOfTeams {
	case 3:
		// 3 Teams, 6x6 = 36 Fields
		// Last team 7 words
		teamAssignments = append(teamAssignments, order[0].Repeat(9)...)
		teamAssignments = append(teamAssignments, order[1].Repeat(8)...)
		teamAssignments = append(teamAssignments, order[2].Repeat(7)...)
		teamAssignments = append(teamAssignments, Neutral.Repeat(11)...)
		teamAssignments = append(teamAssignments, Black)
		break
	case 4:
		// 4 Teams, 7x7 = 49 Fields
		// Last team 6 words
		teamAssignments = append(teamAssignments, order[0].Repeat(10)...)
		teamAssignments = append(teamAssignments, order[1].Repeat(9)...)
		teamAssignments = append(teamAssignments, order[2].Repeat(8)...)
		teamAssignments = append(teamAssignments, order[3].Repeat(7)...)
		teamAssignments = append(teamAssignments, Neutral.Repeat(14)...)
		teamAssignments = append(teamAssignments, Black)
		break
	default:
		// 2 Teams, 5x5 = 25 Fields
		// Starting Team 9 words
		// other team 8 words
		teamAssignments = append(teamAssignments, order[0].Repeat(9)...)
		teamAssignments = append(teamAssignments, order[1].Repeat(8)...)
		teamAssignments = append(teamAssignments, Neutral.Repeat(7)...)
		teamAssignments = append(teamAssignments, Black)
		break
	}

	shuffleCount := randRnd.Intn(5) + 5
	for i := 0; i < shuffleCount; i++ {
		shuffle(randRnd, teamAssignments)
	}
	game.Layout = teamAssignments
	return game
}

func shuffle(rnd *rand.Rand, teamAssignments []Team) {
	for i := range teamAssignments {
		j := rnd.Intn(i + 1)
		teamAssignments[i], teamAssignments[j] = teamAssignments[j], teamAssignments[i]
	}
}
