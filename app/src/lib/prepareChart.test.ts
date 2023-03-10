import { readFileSync } from "fs";
import { join } from "path";

import { initialDoc, prepareChart } from "./prepareChart";

describe("prepareChart", () => {
  test("can migrate old files with yaml", () => {
    expect(prepareChart(getFixture("example1"), initialDoc.details)).toEqual({
      text: `This app works by typing
  Indenting creates a link to the current line
  any text: before a colon creates a label
  Create a link directly using the exact label text
    like this: (This app works by typing)
    [custom ID] or
      by adding an %5BID%5D and referencing that
        like this: (custom ID) // You can also use single-line comments
/*
or
multiline
comments

Have fun! π
*/
`,
      meta: {
        layout: {
          name: "cose",
        },
        theme: "original-dark",
      },
      details: initialDoc.details,
    });
  });

  test("can migrate old files with hidden options", () => {
    expect(prepareChart(getFixture("example2"), initialDoc.details)).toEqual({
      text: `long label text
  (c)
longer label text
  (c)
[c] the longest label text of all
`,
      meta: {
        nodePositions: {
          N14e: { x: 69.45580968418729, y: 42.97973028931095 },
          N150: { x: 112.02947631404595, y: 237.1117560181095 },
          c: { x: 91.4921875, y: 138.375 },
        },
      },
      details: initialDoc.details,
    });
  });

  test("can migrate old files with neither", () => {
    expect(prepareChart(getFixture("example3"), initialDoc.details)).toEqual({
      text: `i am but a simple file\n`,
      meta: {},
      details: initialDoc.details,
    });
  });

  test("can migrate old file with both", () => {
    expect(prepareChart(getFixture("example4"), initialDoc.details)).toEqual({
      text: `μ΄ μ±μ νμ΄νμΌλ‘ μλν©λλ€
  λ€μ¬μ°κΈ°λ νμ¬ μ€μ λν λ§ν¬λ₯Ό μμ±ν©λλ€
  μ½λ‘  μμ λͺ¨λ  νμ€νΈλ: λ μ΄λΈμ μμ±ν©λλ€
  μ νν λ μ΄λΈ νμ€νΈλ₯Ό μ¬μ©νμ¬ μ§μ  λ§ν¬ λ§λ€κΈ°
    μ΄λ κ²: (μ΄ μ±μ νμ΄νμΌλ‘ μλν©λλ€)
    [μ¬μ©μ μ§μ  ID] λλ
      %5BID%5Dλ₯Ό μΆκ°νκ³  μ°Έμ‘°νμ¬
        μ΄λ κ²: (μ¬μ©μ μ§μ  ID) // ν μ€μ μ¬μ©ν  μλ μμ΅λλ€ λκΈ
/*
λλ
λ©ν°λΌμΈ
λκΈ

μ¦κ²¨λ³΄μΈμ! π
*/
`,
      meta: {
        layout: {
          name: "cose",
        },
        theme: "clay",
        nodePositions: {
          N14e: { x: 260.27143997679184, y: 182.9157088415619 },
          N14f: { x: 67.24466938513544, y: 237.52532493169429 },
          N150: { x: 476.79315058009973, y: 295.00196703470885 },
          N151: { x: 146.89348657074046, y: 390.6525082094244 },
          "μ¬μ©μ μ§μ  ID": { x: 303.7526207140005, y: 295.324954187848 },
          N154: { x: 388.3411820878437, y: 404.7001951000867 },
        },
      },
      details: initialDoc.details,
    });
  });

  test("can migrate new file", () => {
    expect(prepareChart(getFixture("example5"), initialDoc.details)).toEqual({
      text: `hello\n  to: the world\n`,
      meta: {
        layout: {
          name: "cose",
          rankDir: "BT",
        },
        theme: "eggs",
      },
      details: initialDoc.details,
    });
  });

  test("can merge a mix of old and new", () => {
    expect(prepareChart(getFixture("example6"), initialDoc.details)).toEqual({
      meta: {
        layout: {
          name: "cose",
          rankDir: "LR",
        },
        style: [
          {
            selector: "edge",
            style: {
              "line-style": "dashed",
            },
          },
          {
            selector: 'edge[source="#red"]',
            style: {
              "line-color": "lime",
              "target-arrow-color": "lime",
              width: 10,
            },
          },
        ],
        theme: "eggs",
      },
      text: `You can set all lines to be dashed
  B
    C
      [#red] D
        Or you can use the source or target or both to make some lines dashed
        x
        y
        z
`,
      details: initialDoc.details,
    });
  });

  test("trims whitespace and adds one newline to text", () => {
    expect(prepareChart(getFixture("example7"), initialDoc.details)).toEqual({
      text: `hello\n  to the: world\n`,
      meta: {
        layout: {
          name: "cose",
          rankDir: "BT",
        },
        theme: "eggs",
      },
      details: initialDoc.details,
    });
  });
});

function getFixture(name: string) {
  return readFileSync(join(__dirname, "fixtures", name), "utf8");
}
