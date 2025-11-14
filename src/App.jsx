import React from 'react';
import xImg from './assets/x.svg';
import oImg from './assets/o.svg';
import xPng from './assets/X Diseño playstation.png';
import oPng from './assets/O Diseño playstation.png';

// Square — componente de casilla: maneja la animación al marcar
class Square extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      animate: false
    };
    this._animationTimer = null;
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.value && this.props.value) {
      this.setState({ animate: true });
      clearTimeout(this._animationTimer);
      this._animationTimer = setTimeout(() => this.setState({ animate: false }), 300);
    }
  }

  componentWillUnmount() {
    clearTimeout(this._animationTimer);
  }

  render() {
    return (
      <button
        className="square"
        data-testid="square"
        onClick={() => this.props.onClick()}
      >
        {this.props.value && this.props.markerImages && this.props.markerImages[this.props.value] ? (
          <img
            className={this.state.animate ? 'marker marker-animate' : 'marker'}
            src={this.props.markerImages[this.props.value]}
            alt={this.props.value}
            style={
              this.props.iconDesign === '2'
                ? { width: '68%', height: '68%', objectFit: 'contain' }
                : { width: '100%', height: '100%', objectFit: 'contain' }
            }
          />
        ) : (
          this.props.value
        )}
      </button>
    );
  }
}


// Board — tablero: renderiza casillas y la línea ganadora
class Board extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lineVisible: false
    };
    this._lineTimer = null;
  }

  componentDidUpdate(prevProps) {
    const prevLine = prevProps.winningLine;
    const nextLine = this.props.winningLine;
    if (nextLine && (!prevLine || prevLine.join(',') !== nextLine.join(','))) {
      this.setState({ lineVisible: false });
      clearTimeout(this._lineTimer);
      this._lineTimer = setTimeout(() => this.setState({ lineVisible: true }), 30);
    } else if (!nextLine && prevLine) {
      this.setState({ lineVisible: false });
      clearTimeout(this._lineTimer);
    }
  }

  componentWillUnmount() {
    clearTimeout(this._lineTimer);
  }

  renderSquare(i) {
    return (
      <Square
        value={this.props.squares[i]}
        onClick={() => this.props.onClick(i)}
        markerImages={this.props.markerImages}
        iconDesign={this.props.iconDesign}
      />
    );
  }

  // Calcula el estilo para la línea ganadora basada en los índices
  computeWinLineStyle(line, size) {
    if (!line || line.length === 0) return null;
    const toCoord = (idx) => ({ row: Math.floor(idx / size), col: idx % size });
    const a = toCoord(line[0]);
    const b = toCoord(line[line.length - 1]);
    const centerCol = (a.col + b.col) / 2;
    const centerRow = (a.row + b.row) / 2;
    const dx = b.col - a.col;
    const dy = b.row - a.row;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI; 
    const lengthUnits = Math.sqrt(dx * dx + dy * dy) + 1; 
    const widthPct = (lengthUnits / size) * 100;

    const leftPct = ((centerCol + 0.5) / size) * 100;
    const topPct = ((centerRow + 0.5) / size) * 100;
    const player = this.props.squares[line[0]];
    const color = (this.props.playerColors && this.props.playerColors[player]) || (player === 'X' ? 'var(--red)' : 'var(--blue)');

    const base = {
      position: 'absolute',
      left: `${leftPct}%`,
      top: `${topPct}%`,
      width: `${widthPct}%`,
      height: '0.5rem',
      background: color,
      transform: `translate(-50%, -50%) rotate(${angle}deg) scaleX(${this.state.lineVisible ? 1 : 0})`,
      transformOrigin: 'center',
      borderRadius: '0.5rem',
      transition: 'transform 360ms cubic-bezier(.2,.9,.22,1)'
    };

    return base;
  }

  render() {
    const size = this.props.boardSize || 3;
    const rows = [];
    for (let r = 0; r < size; r++) {
      const cols = [];
      for (let c = 0; c < size; c++) {
        cols.push(this.renderSquare(r * size + c));
      }
      rows.push(
        <div className="board-row" key={r}>
          {cols}
        </div>
      );
    }

    const winLine = this.props.winningLine;
    const lineStyle = winLine ? this.computeWinLineStyle(winLine, size) : null;

    return (
      <div className="board" style={{ '--board-size': size }}>
        {rows}
        {winLine && (
          <div className="win-line" style={lineStyle} />
        )}
      </div>
    );
  }
}


// Game — lógica principal y estado del juego 
class Game extends React.Component {
  constructor(props) {
    super(props);
    const defaultSize = 3;
    this.state = {
      boardSize: defaultSize,
      markerImages: { X: xImg, O: oImg },
      history: [
        {
          squares: Array(defaultSize * defaultSize).fill(null)
        }
      ],
      stepNumber: 0,
      xIsNext: true,

      // Datos para manejar rondas y marcador
      selectedRounds: 1,
      currentRound: 1,
      scores: { X: 0, O: 0 },
      roundFinished: false,

      // Control general del juego
      isGameStarted: false,
      gameMode: 'two',
      iconDesign: '1',
      playerColors: { X: 'var(--red)', O: 'var(--blue)' },
      showStartOverlay: false,
      showFinalOverlay: false,
      showTiebreakOverlay: false,
      tiebreakActive: false,
      tiebreakContext: null,
      showEasterEgg: false,
      easterPlayer: null,
      markerImages: { X: xImg, O: oImg }
    };
    this._finalOverlayTimer = null;
    this._tiebreakTimer = null;
    this._overlayShowTimer = null;
    this._easterTimer = null;
  }

  scheduleOverlay(stateUpdate) {
    clearTimeout(this._overlayShowTimer);
    const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:640px)').matches;
    const usedDelay = stateUpdate && stateUpdate.showFinalOverlay ? (isMobile ? 2000 : 1000) : 1000;
    this._overlayShowTimer = setTimeout(() => {
      this.setState(stateUpdate);
      this._overlayShowTimer = null;
    }, usedDelay);
  }

  componentWillUnmount() {
    clearTimeout(this._finalOverlayTimer);
    clearTimeout(this._tiebreakTimer);
    clearTimeout(this._easterTimer);
    clearTimeout(this._overlayShowTimer);
  }

  /*
    Añadí un easter egg con mis datos de alumno.
    Si mantienes presionado 1.5 segundos sobre cualquiera de los círculos
    del marcador, aparece la tarjeta con mis datos.
  */
  handleEasterPressStart(player) {
    clearTimeout(this._easterTimer);
    this._easterTimer = setTimeout(() => {
      this.setState({ showEasterEgg: true, easterPlayer: player });
      this._easterTimer = null;
    }, 700);
  }

  handleEasterPressEnd() {
    if (this._easterTimer) {
      clearTimeout(this._easterTimer);
      this._easterTimer = null;
    }
  }

  closeEaster() {
    this.setState({ showEasterEgg: false, easterPlayer: null });
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.showTiebreakOverlay && !prevState.showTiebreakOverlay) {
      clearTimeout(this._tiebreakTimer);
      this._tiebreakTimer = setTimeout(() => {
        const ctx = this.state.tiebreakContext || 'round';
        this.startTiebreak(ctx);
      }, 2000);
    }
    if (!this.state.showTiebreakOverlay && prevState.showTiebreakOverlay) {
      clearTimeout(this._tiebreakTimer);
      this._tiebreakTimer = null;
    }
  }

  setIconDesign(design) {
    const images = design === '2' ? { X: xPng, O: oPng } : { X: xImg, O: oImg };
    const colors = design === '2' ? { X: 'var(--blue)', O: 'var(--red)' } : { X: 'var(--red)', O: 'var(--blue)' };
    this.setState({ iconDesign: design, markerImages: images, playerColors: colors });
  }

  // Lógica de ganador: comprueba filas, columnas y diagonales
  calculateWinner(squares) {
    const n = this.state.boardSize;
    const lines = [];
    // filas
    for (let r = 0; r < n; r++) {
      const row = [];
      for (let c = 0; c < n; c++) row.push(r * n + c);
      lines.push(row);
    }
    // columnas
    for (let c = 0; c < n; c++) {
      const col = [];
      for (let r = 0; r < n; r++) col.push(r * n + c);
      lines.push(col);
    }
    // diagonal principal
    const diag1 = [];
    for (let i = 0; i < n; i++) diag1.push(i * n + i);
    lines.push(diag1);
    // diagonal inversa
    const diag2 = [];
    for (let i = 0; i < n; i++) diag2.push(i * n + (n - 1 - i));
    lines.push(diag2);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const first = squares[line[0]];
      if (!first) continue;
      let allSame = true;
      for (let j = 1; j < line.length; j++) {
        if (squares[line[j]] !== first) {
          allSame = false;
          break;
        }
      }
      if (allSame) return first;
    }
    return null;
  }

  // Devuelve la línea ganadora 
  calculateWinningLine(squares) {
    const n = this.state.boardSize;
    const lines = [];
    for (let r = 0; r < n; r++) {
      const row = [];
      for (let c = 0; c < n; c++) row.push(r * n + c);
      lines.push(row);
    }
    for (let c = 0; c < n; c++) {
      const col = [];
      for (let r = 0; r < n; r++) col.push(r * n + c);
      lines.push(col);
    }
    const diag1 = [];
    for (let i = 0; i < n; i++) diag1.push(i * n + i);
    lines.push(diag1);
    const diag2 = [];
    for (let i = 0; i < n; i++) diag2.push(i * n + (n - 1 - i));
    lines.push(diag2);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const first = squares[line[0]];
      if (!first) continue;
      let allSame = true;
      for (let j = 1; j < line.length; j++) {
        if (squares[line[j]] !== first) {
          allSame = false;
          break;
        }
      }
      if (allSame) return line;
    }
    return null;
  }

  // Historial de movimientos 
  jumpTo(step) {
    this.setState({
      ...this.state,
      stepNumber: step,
      xIsNext: (step % 2) === 0
    });
  }

  // Click del jugador: procesar jugadas y actualizar estado
  handleClick(i) {
    if (!this.state.isGameStarted) return;
    if (this.state.roundFinished) return;
    if (this.state.stepNumber !== this.state.history.length - 1) return;

    const newState = JSON.parse(JSON.stringify(this.state));
    const history = newState.history.slice(0, newState.stepNumber + 1);
    const current = history[history.length - 1];
    const squares = current.squares.slice();

    if (this.calculateWinner(squares) || squares[i]) return;

    squares[i] = newState.xIsNext ? 'X' : 'O';
    newState.history = [...history, { squares }];
    newState.stepNumber = history.length;
    newState.xIsNext = !newState.xIsNext;

    const winner = this.calculateWinner(squares);
    const boardFull = squares.every(v => v !== null);

    if (winner && !newState.roundFinished) {
      newState.scores[winner] = (newState.scores[winner] || 0) + 1;
      newState.roundFinished = true;
      const roundsToWin = Math.floor(newState.selectedRounds / 2) + 1;

      // Si el jugador ya alcanzó las rondas necesarias para ganar la serie,
      // terminar la partida inmediatamente.
      if ((newState.scores[winner] || 0) >= roundsToWin) {
        newState.isGameStarted = false;
        newState.roundFinished = true;
        this.setState(newState, () => {
          this.scheduleOverlay({ showFinalOverlay: true, isGameStarted: false });
        });
        return;
      }

      if (newState.tiebreakActive) {
        if (newState.tiebreakContext === 'round') {
          newState.tiebreakActive = false;
          newState.tiebreakContext = null;
          newState.roundFinished = true;

          const isSeriesEnded = newState.currentRound === newState.selectedRounds;

            if (isSeriesEnded) {
            const scoresEqual = (newState.scores.X || 0) === (newState.scores.O || 0);
            if (scoresEqual) {
              newState.tiebreakContext = 'series';
              newState.tiebreakActive = false;
              this.setState(newState, () => {
                this.scheduleOverlay({ showTiebreakOverlay: true, tiebreakContext: 'series' });
              });
            } else {
              this.setState(newState, () => {
                clearTimeout(this._finalOverlayTimer);
                this._finalOverlayTimer = setTimeout(() => {
                  this.setState({ showFinalOverlay: true, isGameStarted: false });
                }, 1000);
              });
            }
          } else {
            const nextRound = newState.currentRound + 1;
            const size = this.state.boardSize;
            this.setState(newState, () => {
              clearTimeout(this._finalOverlayTimer);
              this._finalOverlayTimer = setTimeout(() => {
                this.setState({
                  currentRound: nextRound,
                  history: [{ squares: Array(size * size).fill(null) }],
                  stepNumber: 0,
                  xIsNext: true,
                  roundFinished: false,
                  isGameStarted: true
                });
              }, 1000);
            });
          }
        } else {
          const other = winner === 'X' ? 'O' : 'X';
          if ((newState.scores[winner] || 0) > (newState.scores[other] || 0)) {
            clearTimeout(this._finalOverlayTimer);
            this._finalOverlayTimer = setTimeout(() => {
              newState.isGameStarted = false;
              newState.tiebreakActive = false;
              newState.tiebreakContext = null;
              this.setState(newState, () => {
                this.scheduleOverlay({ showFinalOverlay: true, isGameStarted: false });
              });
            }, 1000);
          } else {
            newState.tiebreakActive = false;
            this.setState(newState, () => {
              this.scheduleOverlay({ showTiebreakOverlay: true });
            });
          }
        }
      } else {
        if (newState.scores[winner] >= roundsToWin) {
          clearTimeout(this._finalOverlayTimer);
          this._finalOverlayTimer = setTimeout(() => {
            this.scheduleOverlay({ showFinalOverlay: true, isGameStarted: false });
          }, 1000);
        } else {
          const isFinalMatch = newState.currentRound === newState.selectedRounds;
          if (isFinalMatch) {
            const scoresEqual = (newState.scores.X || 0) === (newState.scores.O || 0);
            if (scoresEqual) {
              newState.tiebreakContext = 'series';
              this.setState(newState, () => {
                this.scheduleOverlay({ showTiebreakOverlay: true, tiebreakContext: 'series' });
              });
            } else {
              clearTimeout(this._finalOverlayTimer);
              this._finalOverlayTimer = setTimeout(() => {
                this.scheduleOverlay({ showFinalOverlay: true });
              }, 1000);
            }
          }
        }
      }
    } else if (!winner && boardFull && !newState.roundFinished) {
      newState.roundFinished = true;
      const isFinalMatch = newState.currentRound === newState.selectedRounds;
      if (isFinalMatch) {
        newState.tiebreakContext = 'series';
        this.setState(newState, () => {
          this.scheduleOverlay({ showTiebreakOverlay: true, tiebreakContext: 'series' });
        });
      }
    }



    this.setState(newState);
  }

  // Configuración: tamaño, rondas y control de inicio/reset
  handleBoardSizeChange(size) {
    this.setState((prev) => ({
      boardSize: size,
      history: [{ squares: Array(size * size).fill(null) }],
      stepNumber: 0,
      xIsNext: true,
      currentRound: 1,
      selectedRounds: prev.selectedRounds,
      scores: { X: 0, O: 0 },
      roundFinished: false,
      isGameStarted: false,
      showFinalOverlay: false,
      showTiebreakOverlay: false,
      tiebreakActive: false,
      tiebreakContext: null
    }));
    clearTimeout(this._finalOverlayTimer);
  }

  handleRoundsChange(totalRounds) {
    const size = this.state.boardSize;
    this.setState({
      selectedRounds: totalRounds,
      currentRound: 1,
      scores: { X: 0, O: 0 },
      history: [{ squares: Array(size * size).fill(null) }],
      stepNumber: 0,
      xIsNext: true,
      roundFinished: false,
      isGameStarted: false,
      showFinalOverlay: false,
      showTiebreakOverlay: false,
      tiebreakActive: false,
      tiebreakContext: null
    });
    clearTimeout(this._finalOverlayTimer);
  }

  handleStartGame() {
    if (this.state.isGameStarted) return;
    const size = this.state.boardSize;
    this.setState({
      history: [{ squares: Array(size * size).fill(null) }],
      stepNumber: 0,
      xIsNext: true,
      currentRound: 1,
      scores: { X: 0, O: 0 },
      roundFinished: false,
      isGameStarted: true,
      showFinalOverlay: false,
      showTiebreakOverlay: false,
      tiebreakActive: false,
      tiebreakContext: null
    });
    clearTimeout(this._finalOverlayTimer);
  }

  initiateStartSequence() {
    if (this.state.isGameStarted) return;
    this.setState({ showStartOverlay: true });

    window.setTimeout(() => {
      this.setState({ showStartOverlay: false }, () => this.handleStartGame());
    }, 3000);
  }

  handleResetGame() {
    const size = this.state.boardSize;
    this.setState({
      history: [{ squares: Array(size * size).fill(null) }],
      stepNumber: 0,
      xIsNext: true,
      currentRound: 1,
      scores: { X: 0, O: 0 },
      roundFinished: false,
      isGameStarted: false,
      showFinalOverlay: false,
      showTiebreakOverlay: false,
      tiebreakActive: false,
      tiebreakContext: null
    });
    clearTimeout(this._finalOverlayTimer);
  }

  setGameMode(mode) {
    this.setState({ gameMode: mode });
  }


  // Rondas y desempates: avance de rondas
  startTiebreak(context = 'round') {
    const size = this.state.boardSize;
    this.setState({
      showTiebreakOverlay: false,
      tiebreakActive: true,
      tiebreakContext: context,
      roundFinished: false,
      history: [{ squares: Array(size * size).fill(null) }],
      stepNumber: 0,
      isGameStarted: true
    });
  }

  startNextRound() {
    if (this.state.showFinalOverlay) return;
    if (this.state.showTiebreakOverlay) return;
    if (!this.state.roundFinished) return;
    if (this.state.currentRound >= this.state.selectedRounds) return;

    const size = this.state.boardSize;
    this.setState((prev) => ({
      currentRound: prev.currentRound + 1,
      history: [{ squares: Array(size * size).fill(null) }],
      stepNumber: 0,
      xIsNext: true,
      roundFinished: false,
      isGameStarted: true,
      showFinalOverlay: false
    }));
    clearTimeout(this._finalOverlayTimer);
  }

  // Render y UI: construcción de la interfaz principal
  render() {
    const { history } = this.state;
    const current = history[this.state.stepNumber];
    const winner = this.calculateWinner(current.squares);
    const winningLine = this.calculateWinningLine(current.squares);
    const nextPlayer = this.state.xIsNext ? 'X' : 'O';
    const isBoardFull = current.squares.every(v => v !== null);
    const { scores, selectedRounds, currentRound } = this.state;

    const matchFinished = this.state.roundFinished && currentRound === selectedRounds;
    const showFinalOverlay = this.state.showFinalOverlay === true;

    let status;
    if (matchFinished) {
      if (scores.X > scores.O) {
        status = 'Ganador del juego: X';
      } else if (scores.O > scores.X) {
        status = 'Ganador del juego: O';
      } else {
        status = 'El juego termina en empate';
      }
    } else if (winner) {
      status = 'Ganador de la ronda: ' + winner;
    } else if (isBoardFull) {
      status = 'Empate en la ronda';
    } else if (!this.state.isGameStarted) {
      status = 'Pulsa "Empezar" para iniciar la partida';
    } else {
      status = `Turno de: ${nextPlayer}`;
    }

    const moves = history.map((element, index) => {
      const desc = index === 0 ? 'Ir al inicio' : `Ir al movimiento #${index}`;
      let player = null;
      if (index > 0) {
        const prev = history[index - 1].squares;
        const curr = element.squares;
        for (let i = 0; i < curr.length; i++) {
          if (curr[i] !== prev[i]) {
            player = curr[i];
            break;
          }
        }
      }
      const playerClass = player ? ` move-player-${player}` : '';

      return (
        <li key={index}>
          <button
            data-testid="move"
            className={'move-button' + playerClass}
            onClick={() => this.jumpTo(index)}
          >
            {desc}
          </button>
        </li>
      );
    });

    let finalMessage = '';
    if (scores.X > scores.O) {
      finalMessage = 'El jugador X gana la partida';
    } else if (scores.O > scores.X) {
      finalMessage = 'El jugador O gana la partida';
    } else {
      finalMessage = 'La partida termina en empate';
    }

    return (
      <div className={"game" + (this.state.isGameStarted ? " game-active" : "")}>
        {this.state.showStartOverlay && (
          <div className="start-overlay">
            <div className="start-modal">
              <div className="start-row">
                <div className="start-circle start-red" />
                <div className="start-circle start-blue" />
              </div>
              <div className="start-row labels">
                <div className="start-label">
                  {this.state.gameMode === 'single' ? 'Tú' : 'Jugador 1'}
                </div>
                <div className="start-label">
                  {this.state.gameMode === 'single' ? 'CPU' : 'Jugador 2'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="game-main">
          <aside className="sidebar-left">
            <h1 className="game-title">tic tac toe</h1>
            <div className="card card-config">
              <div className="card-title">Configuración</div>

              <div className="config-section">
                <div className="config-label">Modo de juego</div>
                <div className="pill-group">
                  <button
                    className={
                      'pill-button' + (this.state.gameMode === 'two' ? ' pill-button-active' : '')
                    }
                    onClick={() => this.setGameMode('two')}
                  >
                    Dos jugadores
                  </button>
                </div>
              </div>

              <div className="config-section">
                <div className="config-label">Tema de iconos</div>
                <div className="pill-group">
                  <button
                    className={
                      'pill-button' + (this.state.iconDesign === '1' ? ' pill-button-active' : '')
                    }
                    onClick={() => this.setIconDesign('1')}
                  >
                    Clásico
                  </button>
                  <button
                    className={
                      'pill-button' + (this.state.iconDesign === '2' ? ' pill-button-active' : '')
                    }
                    onClick={() => this.setIconDesign('2')}
                  >
                    PlayStation
                  </button>
                </div>
              </div>


              <div className="config-section">
                <div className="config-label">Tablero</div>
                <div className="pill-group">
                  <button
                    className={
                      'pill-button' +
                      (this.state.boardSize === 3 ? ' pill-button-active' : '')
                    }
                    onClick={() => this.handleBoardSizeChange(3)}
                  >
                    3×3
                  </button>
                  <button
                    className={
                      'pill-button' +
                      (this.state.boardSize === 4 ? ' pill-button-active' : '')
                    }
                    onClick={() => this.handleBoardSizeChange(4)}
                  >
                    4×4
                  </button>
                  <button
                    className={
                      'pill-button' +
                      (this.state.boardSize === 5 ? ' pill-button-active' : '')
                    }
                    onClick={() => this.handleBoardSizeChange(5)}
                  >
                    5×5
                  </button>
                </div>
              </div>

              <div className="config-section">
                <div className="config-label">Rondas</div>
                <div className="pill-group">
                  <button
                    className={
                      'pill-button' +
                      (this.state.selectedRounds === 1 ? ' pill-button-active' : '')
                    }
                    onClick={() => this.handleRoundsChange(1)}
                  >
                    1
                  </button>
                  <button
                    className={
                      'pill-button' +
                      (this.state.selectedRounds === 3 ? ' pill-button-active' : '')
                    }
                    onClick={() => this.handleRoundsChange(3)}
                  >
                    3
                  </button>
                  <button
                    className={
                      'pill-button' +
                      (this.state.selectedRounds === 5 ? ' pill-button-active' : '')
                    }
                    onClick={() => this.handleRoundsChange(5)}
                  >
                    5
                  </button>
                </div>
              </div>

              <div className="config-section">
                <div className="config-label">Ronda actual</div>
                <div className="center-round-value" style={{ fontSize: 16, marginTop: 6 }}>
                  {this.state.currentRound} / {this.state.selectedRounds}
                </div>
              </div>

              <div className="config-actions">
                <button
                  className={
                    'primary-button' +
                    (this.state.isGameStarted ? ' primary-button-secondary' : '')
                  }
                  onClick={() => this.initiateStartSequence()}
                  disabled={this.state.isGameStarted}
                >
                  {this.state.isGameStarted ? 'En juego' : 'Empezar'}
                </button>
                <button
                  className="ghost-button"
                  onClick={() => this.handleResetGame()}
                >
                  Reset
                </button>
              </div>

              <div className="status-text" data-testid="status">
                {status}
              </div>

              {this.state.roundFinished &&
                this.state.currentRound < this.state.selectedRounds && (
                  <button
                    className="next-round-button"
                    onClick={() => this.startNextRound()}
                  >
                    Siguiente ronda
                  </button>
                )}
            </div>
          </aside>

            <div className="game-center">
              <h1 className="game-title mobile-title">tic tac toe</h1>
              <div className="center-scoreboard" style={{ marginBottom: 12 }}>
              {/*
                Aquí añadí el detector de "mantener presionado" para el easter egg.
                Mantén presionado 1.5 segundos sobre el círculo rojo (X) o azul (O)
                para ver la tarjeta con mis datos de alumno.
              */}
              <div
                className={
                  'scoreboard-circle scoreboard-circle-red' +
                  (this.state.xIsNext ? ' scoreboard-circle-active' : '')
                }
                onMouseDown={() => this.handleEasterPressStart('X')}
                onMouseUp={() => this.handleEasterPressEnd()}
                onMouseLeave={() => this.handleEasterPressEnd()}
                onTouchStart={() => this.handleEasterPressStart('X')}
                onTouchEnd={() => this.handleEasterPressEnd()}
                role="button"
                aria-label="Marcador X"
              />
              <div className="scoreboard-score scoreboard-score-combined">
                {this.state.scores.X} - {this.state.scores.O}
              </div>
              <div
                className={
                  'scoreboard-circle scoreboard-circle-blue' +
                  (!this.state.xIsNext ? ' scoreboard-circle-active' : '')
                }
                onMouseDown={() => this.handleEasterPressStart('O')}
                onMouseUp={() => this.handleEasterPressEnd()}
                onMouseLeave={() => this.handleEasterPressEnd()}
                onTouchStart={() => this.handleEasterPressStart('O')}
                onTouchEnd={() => this.handleEasterPressEnd()}
                role="button"
                aria-label="Marcador O"
              />
            </div>

            <div className="game-board-wrapper">
              <div
                className={
                  'game-board' +
                  (!this.state.isGameStarted ? ' game-board-disabled' : '')
                }
              >
                <Board
                  squares={current.squares}
                  onClick={(i) => this.handleClick(i)}
                  boardSize={this.state.boardSize}
                  markerImages={this.state.markerImages}
                  playerColors={this.state.playerColors}
                  iconDesign={this.state.iconDesign}
                  winningLine={winningLine}
                />
              </div>
            </div>
          </div>

          <aside className="sidebar-right">
            <div className="moves-panel">
              <div className="moves-header">Historial de movimientos</div>
              <ol className="moves-list">
                {moves}
              </ol>
            </div>
          </aside>
        </div>

        {showFinalOverlay && (
          <div className="game-over-overlay">
            <div className="game-over-modal">
              <h2 className="game-over-title">Game Over</h2>
              <p className="game-over-message">{finalMessage}</p>
              <div className="game-over-buttons">
                <button
                  className="primary-button"
                  onClick={() => this.handleResetGame()}
                >
                  Jugar de nuevo
                </button>
              </div>
            </div>
          </div>
        )}

        {this.state.showTiebreakOverlay && (
          <div className="game-over-overlay">
            <div className="game-over-modal">
              <h2 className="game-over-title">Juego en desempate</h2>
            </div>
          </div>
        )}

        {/* Easter egg: tarjeta con mis datos,aparece si mantienes 1.5s el marcador */}
        {this.state.showEasterEgg && (
          <div className="game-over-overlay" onClick={() => this.closeEaster()}>
            <div className="game-over-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="game-over-title">Easter egg</h2>
              <div style={{ textAlign: 'left', marginTop: 8 }}>
                <p><strong>Nombre Completo:</strong> Kevin del Jesus Gonzalez Maas</p>
                <p><strong>Carrera:</strong> Ingenieria en Tecnologia de Software</p>
                <p><strong>Matrícula:</strong> 72963</p>
              </div>
              <div className="game-over-buttons" style={{ marginTop: 12 }}>
                <button className="primary-button" onClick={() => this.closeEaster()}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}


// App (root) componente raíz 
function App() {
  return <Game />;
}

export default App;

