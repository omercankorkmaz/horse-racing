/// <reference types="cypress" />
import { mount } from 'cypress/vue';

// global Vue test komutunu ekle
Cypress.Commands.add('mount', mount);
