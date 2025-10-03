
describe('Horse Racing Game', () => {
  it('loads and can generate schedule', () => {
    cy.visit('http://localhost:5173')
    cy.contains('Horse Racing Game')
    cy.get('[data-testid="btn-generate"]').click()
    cy.contains('Yarış Programı')
    cy.get('[data-testid="btn-start"]').click()
    cy.contains('3D Yarış Pisti')
  })
})
