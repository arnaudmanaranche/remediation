# UI Health Score

We use "UI Health Score" instead of "Risk Score" to better communicate what the metric measures.

"Risk" implies security vulnerabilities or bugs. Our score measures design system adoption and consistency — UI health. The logarithmic formula prevents saturation: 100 warnings don't produce a 100/100 score.

We also show "Potential after fixes" to motivate adoption: fixing violations directly improves the score. This creates a clear path from current state to healthy state.
