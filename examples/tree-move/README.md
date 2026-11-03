# TreeGrid subtree move

Open http://127.0.0.1:5173/examples/tree-move/ with the existing local server.
The tree opts into nodeReorder, multiSelect and Shift row ranges. Drag only the
10px service gutter. A middle drop reparents inside; the row top/bottom edge
inserts before/after; empty body appends at root. Dragging a parent carries every
descendant, including collapsed/filtered children. Selected parent+child collapse
to one moved subtree. [READ ONLY] nodes veto the entire proposal through the demo
beforeNodeMove hook. Status/log show the result, IDs, node count and reason.

Sort names demonstrates the conservative sibling-order policy: before/after
reject under active sort; inside reparents and stays sorted. Clear sorting enables
manual sibling order again. Undo/Redo use the existing single-store history.
No cross-tree move, copy, external drop or persistence is implemented.
See ../../docs/TREE_GRID_MOVE.md for the exact contract and verification limits.
