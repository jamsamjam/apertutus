const fs = require('fs');
const path = require('path');
function fallbackCategorize(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('kidnap') || lowerPrompt.includes('ransom') || lowerPrompt.includes('arson') || 
      lowerPrompt.includes('steal') || lowerPrompt.includes('bomb') || lowerPrompt.includes('smuggl')) {
    return 'Illegal Activities';
  }
  if (lowerPrompt.includes('holocaust') || lowerPrompt.includes('nazi') || lowerPrompt.includes('genocide')) {
    return 'Hate Speech';
  }
  if (lowerPrompt.includes('self-harm') || lowerPrompt.includes('dismember') || lowerPrompt.includes('violence')) {
    return 'Violence & Harm';
  }
  if (lowerPrompt.includes('sexual') || lowerPrompt.includes('consent') || lowerPrompt.includes('explicit')) {
    return 'Sexual Content';
  }
  if (lowerPrompt.includes('scam') || lowerPrompt.includes('credit card') || lowerPrompt.includes('fraud')) {
    return 'Fraud & Scams';
  }
  if (lowerPrompt.includes('wikipedia') || lowerPrompt.includes('voter fraud') || lowerPrompt.includes('never happened')) {
    return 'Misinformation';
  }
  if (lowerPrompt.includes('scrap') || lowerPrompt.includes('hack') || lowerPrompt.includes('account')) {
    return 'Privacy & Security';
  }
  if (lowerPrompt.includes('gaslight') || lowerPrompt.includes('manipulat') || lowerPrompt.includes('bully')) {
    return 'Psychological Manipulation';
  }
  if (lowerPrompt.includes('ivermectin') || lowerPrompt.includes('medical') || lowerPrompt.includes('health')) {
    return 'Health Misinformation';
  }
  
  return 'Illegal Activities';
}

async function categorizeData() {
  try {
    const dataPath = path.join(__dirname, '../data/sample.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    const categorizedData = data.map(item => ({
      ...item,
      category: fallbackCategorize(item.question)
    }));
    
    const outputPath = path.join(__dirname, '../public/data/final_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(categorizedData, null, 2));
    
    console.log(`Successfully categorized ${categorizedData.length} items and saved to ${outputPath}`);
    
    const categoryCount = {};
    categorizedData.forEach(item => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    });
    
    console.log('\nCategory Distribution:');
    Object.entries(categoryCount).forEach(([category, count]) => {
      const percentage = ((count / categorizedData.length) * 100).toFixed(1);
      console.log(`${category}: ${count} (${percentage}%)`);
    });
    
  } catch (error) {
    console.error('Error categorizing data:', error);
  }
}

categorizeData();
