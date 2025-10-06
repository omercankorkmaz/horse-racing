// cypress/e2e/controls.cy.ts
// Controls.vue için E2E test: Start/Pause/Resume davranışı ve renk sınıfları
/// <reference types="cypress" />
describe('Controls (Start / Pause / Resume)', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should handle Start → Pause → Resume flow', () => {
    cy.get('[data-testid="btn-generate"]').click();
    cy.contains('button', 'Start').should('have.class', 'btn-start').click();
    cy.contains('button', 'Pause').should('have.class', 'btn-pause').click();
    cy.contains('button', 'Resume').should('have.class', 'btn-resume');
  });
});
