import { httpError } from '../../shared/express.js';
import { readRequiredNumber, readRequiredPositiveInteger } from '../../shared/validation.js';

export const ORDER_STATUSES = ['brouillon', 'validée', 'annulée', 'livrée'];

export async function validateOrderLines(requestLines, options = {}) {
  if (!Array.isArray(requestLines)) {
    throw httpError(400, 'Les lignes de commande doivent être une liste');
  }

  if (requestLines.length === 0) {
    throw httpError(400, 'La commande doit contenir au moins un produit');
  }

  return Promise.all(
    requestLines.map(async (line) => {
      const productId = readRequiredPositiveInteger(line, 'produit_id', 'Produit');
      const quantity = readRequiredNumber(line, 'quantite', 'Quantité', { minExclusive: 0 });
      const product = options.loadProduct ? await options.loadProduct(productId) : { id: productId, prix: line.prix };
      const unitPrice = readRequiredNumber({ prix: line.prix ?? product.prix }, 'prix', 'Prix', { min: 0 });

      return {
        produit_id: Number(product.id ?? productId),
        quantite: quantity,
        prix: unitPrice
      };
    })
  );
}

export function calculateTotal(lines) {
  return lines.reduce((sum, line) => sum + line.prix * line.quantite, 0);
}
