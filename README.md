A simple tip calculator using AI model for receipt parsing. 

The tip is calculated off the base amount = pre-tax bill minus any misc charges (service charge, health charge, happy manager fee, etc).

<img width="482" alt="Screenshot 2025-05-30 at 5 06 30 PM" src="https://github.com/user-attachments/assets/5bb7ce14-fde3-4d75-9c19-3b4a2c069aba" />

## Running Locally

First, set the [Google Gemini API key](https://aistudio.google.com/apikey):
```bash
export GOOGLE_GEMINI_API_KEY=
```

Second, run the development server:

```bash
npm install
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
