Project Description
It is a web-based DFA Minimization Visualizer that allows users to construct a deterministic finite automaton.

Features:
DFA Input
The system allows users to define states, alphabet, start state, final states, and transitions.
Transition Table Representation
The DFA is stored internally in a structured transition table format.
Graph Visualization
The DFA is displayed as a graph with states as nodes and transitions as edges.
This makes the automaton easier to understand visually.  
Table-Filling Algorithm
The project uses the distinguishability table method for minimization.
It compares pairs of states to determine equivalence or distinction.
Step-by-Step Minimization
The algorithm marks state pairs iteratively based on transition behavior.
The process continues until no further changes occur.
Interactive Explanation
Users can click on table entries to see why a pair is marked or unmarked.
This helps in understanding the logic behind minimization.
Equivalent State Merging
Indistinguishable states are grouped together into a single state.
This reduces redundancy in the DFA.
Minimized DFA Generation
A new DFA is constructed using the merged states.
It accepts the same language with fewer states.
Final Visualization
The minimized DFA is displayed graphically for comparison.

