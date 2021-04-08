import React, {
  Dispatch,
  memo,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import cytoscape, {
  Core,
  CytoscapeOptions,
  EdgeSingular,
  NodeSingular,
} from "cytoscape";
import { useDebouncedCallback } from "use-debounce";
import dagre from "cytoscape-dagre";
import cytoscapeSvg from "cytoscape-svg";
import { LAYOUT } from "../constants";
import { parseText, useAnimationSetting } from "../utils";
import styles from "./Graph.module.css";
import { saveAs } from "file-saver";
import { Box, BoxProps, Type } from "../slang";
import { compressToEncodedURIComponent as compress } from "lz-string";
import MenuRight from "./MenuRight";
import { AppContext } from "./AppContext";
import { colors } from "../slang/config";

if (!cytoscape.prototype.hasInitialised) {
  cytoscape.use(dagre);
  cytoscape.use(cytoscapeSvg);
  cytoscape.prototype.hasInitialised = true;
}

const Graph = memo(
  ({
    textToParse,
    setHoverLineNumber,
    shouldResize,
  }: {
    textToParse: string;
    setHoverLineNumber: Dispatch<SetStateAction<number | undefined>>;
    shouldResize: number;
  }) => {
    const cy = useRef<undefined | Core>();
    const errorCy = useRef<undefined | Core>();
    const animate = useAnimationSetting();
    const graphInitialized = useRef(false);
    const { theme } = useContext(AppContext);
    const themeString = JSON.stringify(theme);

    const updateGraph = useCallback(() => {
      if (cy.current) {
        let error = false;
        let newElements: cytoscape.ElementDefinition[] = [];

        try {
          newElements = parseText(textToParse);
          errorCy.current?.json({ elements: newElements });
        } catch {
          error = true;
          errorCy.current?.destroy();
          errorCy.current = cytoscape();
        }
        if (!error) {
          cy.current.json({ elements: newElements });
          cy.current
            .layout({
              ...LAYOUT,
              animate: graphInitialized.current ? animate : false,
            } as any)
            .run();
          cy.current.center();
          graphInitialized.current = true;
        }
      }
    }, [animate, textToParse]);

    const handleResize = useCallback(() => {
      if (cy.current) {
        cy.current.resize();
        cy.current.animate({ fit: { padding: 6 } } as any);
      }
    }, []);

    useEffect(() => {
      handleResize();
    }, [handleResize, shouldResize]);

    const debouncedResize = useDebouncedCallback(handleResize, 250);

    useEffect(() => {
      window.addEventListener("resize", debouncedResize.callback);
      return () =>
        window.removeEventListener("resize", debouncedResize.callback);
    }, [debouncedResize]);

    const downloadImageAsSVG = useCallback(() => {
      if (cy.current) {
        // @ts-ignore
        const svgStr = cy.current.svg({
          full: true,
          scale: 1.5,
          bg: theme.background === "#ffffff" ? undefined : theme.background,
        });
        const domparser = new DOMParser();
        let svgEl = domparser.parseFromString(svgStr, "image/svg+xml");
        let squares: Element[] = [
          ...svgEl.children[0].querySelectorAll("path"),
        ].filter(
          (x) =>
            !x.getAttribute("fill") &&
            x.getAttribute("paint-order") === "fill stroke markers"
        );
        squares = [...squares, ...svgEl.children[0].querySelectorAll("rect")];
        squares.forEach((el) => el.setAttribute("fill", theme.background));

        // Add comment
        const originalTextComment = svgEl.createComment(
          `Original Flowchart Text (flowchart.fun):\n\n${textToParse}\n\n`
        );
        svgEl.children[0].appendChild(originalTextComment);
        const correctedSvgStr = svgEl.documentElement.outerHTML;
        saveAs(
          new Blob([correctedSvgStr], {
            type: "image/svg+xml;charset=utf-8",
          }),
          "flowchart.svg"
        );
      }
    }, [textToParse, theme.background]);

    const downloadImageAsPNG = useCallback(() => {
      if (cy.current) {
        // @ts-ignore
        const pngStr = cy.current.png({
          full: true,
          scale: 1.5,
          output: "blob",
        });
        saveAs(
          new Blob([pngStr], {
            type: "image/png",
          }),
          "flowchart.png"
        );
      }
    }, []);

    const downloadImageAsJPG = useCallback(() => {
      if (cy.current) {
        // @ts-ignore
        const jpgStr = cy.current.jpg({
          full: true,
          scale: 1.5,
          output: "blob",
        });
        saveAs(
          new Blob([jpgStr], {
            type: "image/jpg",
          }),
          "flowchart.jpg"
        );
      }
    }, []);

    useEffect(() => {
      errorCy.current = cytoscape();
      cy.current = cytoscape({
        container: document.getElementById("cy"), // container to render in
        layout: { ...LAYOUT },
        elements: [],
        style: getCyStyleFromTheme(colors),
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
        wheelSensitivity: 0.2,
      });
      const cyCurrent = cy.current;
      const errorCyCurrent = errorCy.current;

      // Hovering Events
      function nodeHighlight(this: NodeSingular) {
        this.addClass("nodeHovered");
        setHoverLineNumber(this.data().lineNumber);
      }
      function edgeHighlight(this: EdgeSingular) {
        this.addClass("edgeHovered");
        setHoverLineNumber(this.data().lineNumber);
      }
      function unhighlight(this: NodeSingular | EdgeSingular) {
        this.removeClass("nodeHovered");
        this.removeClass("edgeHovered");
        setHoverLineNumber(undefined);
      }
      cyCurrent.on("mouseover", "node", nodeHighlight);
      cyCurrent.on("mouseover", "edge", edgeHighlight);
      cyCurrent.on("tapstart", "node", nodeHighlight);
      cyCurrent.on("tapstart", "edge", edgeHighlight);
      cyCurrent.on("mouseout", "node, edge", unhighlight);
      cyCurrent.on("tapend", "node, edge", unhighlight);

      return () => {
        cyCurrent.destroy();
        errorCyCurrent.destroy();
        cy.current = undefined;
        errorCy.current = undefined;
      };
    }, [setHoverLineNumber]);

    // Update graph color
    useEffect(() => {
      let newTheme = colors;
      try {
        newTheme = JSON.parse(themeString);
      } catch (e) {
        console.error(e);
      }
      console.log(cy.current);
      if (cy.current) {
        console.log("TRYING");
        cy.current.json({ style: getCyStyleFromTheme(newTheme) });
        cy.current.center();
      }
    }, [themeString]);

    useEffect(() => {
      updateGraph();
    }, [updateGraph]);

    return (
      <>
        <Box
          className={[styles.GraphContainer, "graph"].join(" ")}
          overflow="hidden"
          h="100%"
        >
          <Box id="cy" overflow="hidden" />
        </Box>
        <MenuRight>
          <Box
            flow="column"
            display={false}
            at={{ tablet: { display: true } }}
            pr={4}
          >
            <MenuButton onClick={downloadImageAsSVG} title="Download SVG">
              SVG
            </MenuButton>
            <MenuButton onClick={downloadImageAsJPG} title="Download JPG">
              JPG
            </MenuButton>
            <MenuButton onClick={downloadImageAsPNG} title="Download PNG">
              PNG
            </MenuButton>
            <MenuButton
              as="a"
              className={styles.TypeLink}
              target="_blank"
              rel="noreferrer"
              href={`${new URL(window.location.href).origin}/c/${compress(
                textToParse
              )}`}
            >
              Share
            </MenuButton>
          </Box>
        </MenuRight>
      </>
    );
  }
);

Graph.displayName = "Graph";

export default Graph;

function MenuButton({
  children,
  className = "",
  ...props
}: { children: string } & BoxProps) {
  return (
    <Box
      as="button"
      content="center"
      px={2}
      className={[styles.menuRightButton, className].join(" ")}
      {...props}
    >
      <Type>{children}</Type>
    </Box>
  );
}

function getCyStyleFromTheme(theme: typeof colors): CytoscapeOptions["style"] {
  return [
    {
      selector: "node",
      style: {
        backgroundColor: theme.background,
        "border-color": theme.foreground,
        color: theme.foreground,
        label: "data(label)",
        "font-size": 10,
        "text-wrap": "wrap",
        "text-max-width": "80",
        "text-valign": "center",
        "text-halign": "center",
        // @ts-ignore
        "line-height": 1.25,
        "border-width": 1,
        shape: "rectangle",
        "font-family":
          "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol",
        width: "data(width)",
        height: "data(height)",
      },
    },
    {
      selector: "edge",
      style: {
        // @ts-ignore
        "loop-direction": "0deg",
        "loop-sweep": "20deg",
        width: 1,
        "text-background-opacity": 1,
        "text-background-color": theme.background,
        "line-color": theme.foreground,
        "target-arrow-color": theme.foreground,
        "target-arrow-shape": "vee",
        "arrow-scale": 1,
        "curve-style": "bezier",
        label: "data(label)",
        color: theme.foreground,
        "font-size": 10,
        "text-valign": "center",
        "font-family":
          "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol",
        "text-halign": "center",
        // @ts-ignore
        "edge-text-rotation": "autorotate",
      },
    },
    {
      selector: ".edgeHovered",
      style: {
        "line-color": theme.edgeHover,
        "target-arrow-color": theme.edgeHover,
        color: theme.edgeHover,
      },
    },
    {
      selector: ".nodeHovered",
      style: {
        backgroundColor: theme.nodeHover,
      },
    },
  ];
}
