/**
 * Load Razorpay checkout script dynamically
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        resolve(window.Razorpay);
      });
      existingScript.addEventListener('error', reject);
      return;
    }

    // Create and append script tag
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      resolve(window.Razorpay);
    };
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay checkout script'));
    };
    document.body.appendChild(script);
  });
};

/**
 * Initialize Razorpay checkout
 * @param {Object} order - Order details from backend
 * @param {Object} options - Additional options (name, description, prefill, etc.)
 * @returns {Promise} - Resolves with payment details on success
 */
export const initializeRazorpayCheckout = async (order, options = {}) => {
  try {
    // Load Razorpay script
    const Razorpay = await loadRazorpayScript();

    return new Promise((resolve, reject) => {
      const razorpayOptions = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: options.name || 'Therapy Tracker',
        description: options.description || 'Subscription Payment',
        order_id: order.id,
        prefill: {
          name: options.prefill?.name || '',
          email: options.prefill?.email || '',
          contact: options.prefill?.contact || '',
        },
        theme: {
          color: '#6366f1', // indigo color
        },
        handler: function (response) {
          // Payment successful
          resolve({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: function () {
            // User closed the payment modal
            reject(new Error('Payment cancelled by user'));
          },
        },
      };

      const razorpay = new Razorpay(razorpayOptions);
      razorpay.open();
    });
  } catch (error) {
    throw new Error(`Failed to initialize Razorpay: ${error.message}`);
  }
};



