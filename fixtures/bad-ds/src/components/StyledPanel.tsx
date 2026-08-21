import React from 'react';
import styled from 'styled-components';

// CSS-in-JS tagged templates: detected by scan, rewritten by the codemod.
const StyledPanel = styled.div`
  background-color: ${colors.white};
  border: ${spacing.xs} solid ${colors.gray200};
  border-radius: ${spacing.sm};
  padding: ${spacing.lg} ${spacing.md-16};
  font-size: ${typography.sm};
  font-weight: ${typography.semibold};
  box-shadow: 0 ${spacing.xs} ${spacing.xs} ${colors.black};
  color: ${(props) => props.accent};
`;

export function Panel({ accent, children }: { accent?: string; children: React.ReactNode }) {
  return (
    <StyledPanel accent={accent}>
      {children}
    </StyledPanel>
  );
}
