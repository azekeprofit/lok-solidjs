import { render } from 'solid-js/web';
import { createSignal, Show, For, splitProps, Component, createEffect } from "solid-js";
import { createStore, produce } from "solid-js/store";

import "./style.css";

export function App() {

  enum direction {
    noDirection,
    left,
    right,
    up,
    down,
    disconnected,
  }

  enum UIMode {
    pick1stLetter,
    pick2ndLetter,
    pickRestOfLetters,
    pickOneBlock,
    pickTwoBlocks,
    pickTwoBlocks2nd,
    blackenAllBlocksWithSameLetter,
    solved,
    markOneEmptyBlock,
    inputLetter
  }

  enum crossed {
    horizonthal,
    vertical,
    cornerUpLeft,
    cornerUpRight,
    cornerDownLeft,
    cornerDownRight
  }

  function toKebabCase(str:string):string {
    return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }


  const labels = {
    [UIMode.pick1stLetter]: "start entering a spell",
    [UIMode.pick2ndLetter]: "keep picking letters",
    [UIMode.pickRestOfLetters]: "keep picking letters",
    [UIMode.pickOneBlock]: "pick a cell to black out",
    [UIMode.pickTwoBlocks]: "pick 2 cells to black out",
    [UIMode.pickTwoBlocks2nd]: "pick 2nd cell adjacent to previous",
    [UIMode.blackenAllBlocksWithSameLetter]:
      "pick a cell, all cells with same letter will be blackened out",
    [UIMode.solved]: "You solved it! Well done!",
    [UIMode.markOneEmptyBlock]: "Mark one empty block",
    [UIMode.inputLetter]: "Input a letter into selected block",
  } as { [key in UIMode]: string };

  const [mode, setMode] = createSignal(UIMode.pick1stLetter);

  const [customPuzzle, setCustomPuzzle] = createSignal<boolean>(false);
  const [puzzleText, setPuzzleText] = createSignal<string>('');

  const spells = {
    LOK: UIMode.pickOneBlock,
    TLAK: UIMode.pickTwoBlocks,
    TA: UIMode.blackenAllBlocksWithSameLetter,
    BE: UIMode.markOneEmptyBlock,
  } as {
    [index: string]: UIMode;
  };

  let lastPoint: Cell;

  const [spell, setSpell] = createSignal("");

  class Cell {
    content: string;
    x: number;
    y: number;
    blackened: boolean = false;
    emptyCell: boolean = false;
    beingMarked: boolean = false;
    noCell: boolean = false;

    constructor(content: string, x: number, y: number) {
      this.content = content;
      this.noCell = content == " ";
      switch (content) {
        case "*":
          this.blackened = true;
          break;
        case "_":
          this.content = " ";
          this.emptyCell = true;
          break;
      }

      this.x = x;
      this.y = y;
    }
  }

  let maxCol = 0;
  let maxRow = 0;
  const [board, setBoard] = createStore<Cell[][]>([]);

  let select: HTMLSelectElement;

  let spellDirection = direction.noDirection;

  function adjacent(a: Cell, b: Cell) {
    const vDiff = a.y - b.y;
    const hDiff = a.x - b.x;

    if (vDiff == 0) {
      if (horizonthallyAdjacent(a.x, b.x, a.y))
        return hDiff > 0 ? direction.right : direction.left;
      else if (horizonthallyAdjacentWrapped(a.x, b.x, a.y))
        return hDiff < 0 ? direction.right : direction.left;
    }
    if (hDiff == 0) {
      if (verticallyAdjacent(a.y, b.y, a.x))
        return vDiff > 0 ? direction.down : direction.up;
      else if (verticallyAdjacentWrapped(a.y, b.y, a.x))
        return vDiff < 0 ? direction.down : direction.up;
    }

    return direction.disconnected;
  }

  function horizonthallyAdjacent(x1: number, x2: number, y: number) {
    const startX = Math.min(x1, x2) + 1;
    const endX = Math.max(x1, x2);
    for (var i = startX; i < endX; i++) {
      const cell = board[y][i];
      if (!cell.blackened && cell.emptyCell && !cell.noCell) return false;
    }

    return true;
  }

  function horizonthallyAdjacentWrapped(x1: number, x2: number, y: number) {
    const startX = Math.min(x1, x2) + 1;
    const endX = Math.max(x1, x2);
    return (
      horizonthallyAdjacent(-1, startX, y) &&
      horizonthallyAdjacent(endX, maxCol + 1, y)
    );
  }

  function verticallyAdjacent(y1: number, y2: number, x: number) {
    const startY = Math.min(y1, y2) + 1;
    const endY = Math.max(y1, y2);
    for (var i = startY; i < endY; i++) {
      const cell = board[i][x];
      if (!cell.blackened && cell.emptyCell && !cell.noCell) return false;
    }
    return true;
  }

  function verticallyAdjacentWrapped(y1: number, y2: number, x: number) {
    const startY = Math.min(y1, y2) + 1;
    const endY = Math.max(y1, y2);
    return (
      verticallyAdjacent(-1, startY, x) &&
      verticallyAdjacent(endY, maxRow + 1, x)
    );
  }

  function spellOut(cell: Cell) {
    if (cell.content != "X") {
      let newSpell = spell() + cell.content;
      setSpell(newSpell);

      if (newSpell in spells) {
        setSpell("");
        setMode(spells[newSpell]);
      }
    }
  }

  function blacken(c: Cell) {
    setBoard(c.y, c.x, "blackened", true);
  }

  const CellComponent: Component<{ cell: Cell }> = (props) => {
    const [local, _] = splitProps(props, ["cell"]);

    const [cell] = createStore(local.cell);

    function click(cell: Cell) {
      if (cell.blackened || cell.noCell) return;
      switch (mode()) {
        case UIMode.pick1stLetter:
          if (cell.emptyCell) return;
          lastPoint = cell;
          setMode(UIMode.pick2ndLetter);
          if (cell.content != "X") blacken(cell);
          spellOut(cell);
          break;

        case UIMode.pick2ndLetter:
        case UIMode.pickRestOfLetters:
          if (cell.emptyCell) return;
          const dir = adjacent(cell, lastPoint!);
          if (dir == direction.disconnected) return;
          if (mode() == UIMode.pick2ndLetter) spellDirection = dir;
          else if (spellDirection != dir) return;
          if (cell.content != "X") {
            blacken(cell);
            setMode(UIMode.pickRestOfLetters);
          }
          lastPoint = cell;
          spellOut(cell);

          break;

        case UIMode.pickOneBlock:
          blacken(cell);
          setMode(UIMode.pick1stLetter);
          break;
        case UIMode.pickTwoBlocks:
          blacken(cell);
          setMode(UIMode.pickTwoBlocks2nd);
          lastPoint = cell;
          break;
        case UIMode.pickTwoBlocks2nd:
          if (adjacent(cell, lastPoint!) == direction.disconnected) return;
          blacken(cell);
          setMode(UIMode.pick1stLetter);
          break;

        case UIMode.blackenAllBlocksWithSameLetter:
          setMode(UIMode.pick1stLetter);
          setBoard({ from: 0, to: maxRow }, c => c.content == cell.content, "blackened", true);
          break;

        case UIMode.markOneEmptyBlock:
          setBoard(cell.y, cell.x, "beingMarked", true);
      }

      if (mode() == UIMode.pick1stLetter && board.every((line) => line.every((cell) => cell.blackened || cell.noCell)))
        setMode(UIMode.solved);
    }

    function endInputting(cell: Cell) {
      setBoard(cell.y, cell.x, produce(cell => {
        cell.content = input.value.toUpperCase();
        cell.emptyCell = cell.beingMarked = false;
      }));
      setMode(UIMode.pick1stLetter);
    }

    let input: HTMLInputElement;



    return (
      <td classList={{
        cell: true,
        hasContent: !cell.noCell,
        blackened: cell.blackened,
      }} onClick={[click, cell]}>
        <Show when={!cell.beingMarked}>{cell.content}</Show>
        <Show when={cell.beingMarked}><input ref={el=>input=el} autofocus onkeypress={e => { if (e.keyCode == 13) endInputting(cell) }} onBlur={[endInputting, cell]}></input></Show>
      </td>
    );
  };

  function lokify(puzzle: string) {
    const puzzleUp = puzzle.toUpperCase();
    setPuzzleText(puzzleUp);
    const newBoard = [
      ...puzzleUp
        .split("\n")
        .map((l, y) => [...[...l].map((c, x) => new Cell(c, x, y))]),
    ];
    setBoard(newBoard);
    maxRow = newBoard.length - 1;
    maxCol = Math.max(...newBoard.map((l) => l.length)) - 1;

    setMode(UIMode.pick1stLetter);
    setSpell("");
  }

  const defaultStore = [
    { num: 1, puzzle: "**\n**" },
    { num: 2, puzzle: "KOL\n _" },
    { num: 3, puzzle: "LKOL\nO  _\nK  _" },
    { num: 4, puzzle: "_K\nLOK\nOL\nK" },
    { num: 5, puzzle: "  L\n  O\n K_\nLOOK_\n L_\n  K" },
    { num: 6, puzzle: "OLKOLKOK" },
    { num: 7, puzzle: "K\nO_L_O_K\nKLOKO_L\nL" },
    { num: 8, puzzle: "LOL\nO_O\nKOLOK\n  O\n  K" },
    { num: 9, puzzle: "TLTLAKAK\n___\n_" },
    { num: 10, puzzle: "  _ T\n  K L\n  A _\nKOL___L\n  T A\n    K" },
    { num: 11, puzzle: "KTL\nLLK\nOAO_\nLKK_" },
    { num: 12, puzzle: "  K\n __\nTLOAK\nKOL_\n KL" },
    { num: 13, puzzle: " LOK\nTL_AK\n_KAL_T\nK___OL" },
    { num: 14, puzzle: " _\n TT\nTLL\nLAA\nAKK\nKOL\n _" },
    { num: 15, puzzle: " _K\nKALLT\nK_O_O_L\n LOK\n  L" },
    { num: 16, puzzle: "  K\n  O_L\n  LOK\nTLAKOOK\n  L K" },
    { num: 17, puzzle: "L      L\nTTLLAAKK\nOLOKOAKO\nK K K  K" },
    { num: 18, puzzle: "TA\nUUU\nUUU" },
    { num: 19, puzzle: " HHH\nTGTGA\n GAG" },
    { num: 20, puzzle: "SALASOK\n   T" },
    { num: 21, puzzle: "TE_A\nDT_A\nDETA\n" },
    { num: 23, puzzle: "  TL\n  LO\nTLTAAK\n  AK\n  K" },
    { num: 24, puzzle: "T_T_LAK\n_______\nTLALOK" },
    { num: 25, puzzle: "   T\n  FLZD\nTLZAAK\n LOK\n" },
    { num: 26, puzzle: "TLATLAKK\n   LOK\n   KALT" },
    { num: 27, puzzle: "MJKKJ\nLOTAK\n DAAD\n  LLJ\n  TTD\n  M" },
    { num: 28, puzzle: "LOXK" },
    { num: 29, puzzle: "TLX\nKAX" },
    { num: 30, puzzle: "L K\nXOXOK\n  L" },
    { num: 32, puzzle: "  TX\nXK_L_T\nAXAX" },
    { num: 33, puzzle: "    K\n TAKA\nX__AX\nLTLX\nT" },
  ];

  const [storage, setStorage] = createSignal(
    JSON.parse(localStorage["LOKstorage"] ?? JSON.stringify(defaultStore)) as {
      num: number;
      puzzle: string;
    }[]
  );

  function save() {
    const answer = prompt(
      "Enter number of the puzzle",
      (storage()[storage().length - 1].num + 1).toString()
    );
    const num = parseInt(answer!);
    if (num > 0) {
      const newStorage = [
        ...storage().filter((p) => p.num != num),
        { num, puzzle: puzzleText() },
      ];
      newStorage.sort((a, b) => a.num - b.num);
      setStorage(newStorage);
      localStorage["LOKstorage"] = JSON.stringify(newStorage);
      loadPuzzle(num.toString());
    }
  }

  function loadPuzzle(num: string) {
    for (let p of storage()) {
      if (p.num == parseInt(num)) {
        setPuzzleText(p.puzzle);
        select.value = num;
        lokify(p.puzzle);
        return;
      }
    }
  }

  createEffect(() => loadPuzzle('2'));

  return (
    <>
      <h1>LOK (web-version)</h1>
      <p>
        This is an interactive version of puzzles from "
        <a href="https://www.blazgracar.com/lok">LOK</a>" by Blaž Urban Gracar
      </p>
      <p>
        <Show when={storage().length > 0}>
          <label>Enter puzzle number:
            <select ref={el=>select=el} onChange={(e) => loadPuzzle(select.value)}>
              <For each={storage()}>
                {({ num }) => <option value={num}>{num}</option>}
              </For>
            </select></label>
        </Show>
      </p>
      <Show when={customPuzzle()}>
        <textarea cols="20" rows="6" value={puzzleText()} onInput={e => setPuzzleText(e.currentTarget.value)}
        >{`KOL\n _`}</textarea>
      </Show>

      <Show when={!customPuzzle()}>

        <p>{labels[mode()]}</p>
        <table>
          <For each={board}>
            {(line) => (
              <tr>
                <For each={line}>{(cell) => <CellComponent cell={cell} />}</For>
              </tr>
            )}
          </For>
        </table>
        <p>Spell: {spell()}</p>
        <p><button onClick={e => lokify(puzzleText())}>reset</button></p>
      </Show>
      <p>
        <Show when={customPuzzle()}><button onClick={(e) => { lokify(puzzleText()); setCustomPuzzle(false); }}>LOKify</button><button onClick={(e) => save()}>save</button></Show>
        <Show when={!customPuzzle()}><button onClick={(e) => setCustomPuzzle(true)}>Custom puzzle</button></Show>
      </p>
      <Show when={customPuzzle()}><p>
        Enter the puzzle from the book into this text field. Empty spaces type
        in as spaces, empty blocks type as "_", black blocks as "*"
      </p></Show>
    </>
  );
}

render(()=><App />, document.body);