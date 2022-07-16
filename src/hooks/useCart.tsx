import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
  
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let [productResponse, stockResponse] = await Promise.all([
        api.get(`/products/${productId}`),
        api.get(`/stock/${productId}`),
      ]);

      const product = productResponse.data as Product;
      const stock = stockResponse.data as Stock;
      const productExists = cart.find(p => p.id === product.id);

      if (productExists) {
        if (stock.amount < productExists.amount + 1) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        productExists.amount += 1;
      }else{
        product.amount = 1;
        cart.push(product);
      }
      
      setCart([...cart]);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    const productIndex = cart.findIndex(p => p.id === productId);

    if (productIndex >= 0) {
      cart.splice(productIndex, 1);
      setCart([...cart]);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }else{
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stock = await api.get(`/stock/${productId}`);
      const stockData = stock.data as Stock;
      const productIndCart = cart.find(prod => prod.id === productId);
      
      if (productIndCart) {
        if (amount > 0) {
          if (stockData.amount < amount) {
            toast.error('Quantidade solicitada fora de estoque');
            return;
          }

          productIndCart.amount = amount;
          setCart([...cart]);
          localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
        }
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
