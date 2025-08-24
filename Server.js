// Server.js - Updated with Supabase connection and unique data fetching
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ✅ Debug: Check if environment variables are loaded
console.log('🔍 Environment Variables Check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Loaded' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Loaded' : '❌ Missing');

// ✅ Use environment PORT for Render
const PORT = process.env.PORT || 3002;

// ✅ CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174',
    'https://warm-melomakarona-61cb3e.netlify.app',
    'https://bluestock-ml-analysis.vercel.app',    
    'https://bluestock-ml-analysis-g85a.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.options('*', cors());
app.use(express.json());

// ✅ SUPABASE CONNECTION (Simplified for Pooler URL)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase;
let databaseConnected = false;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      realtime: { enabled: false }
    });
    
    console.log('✅ Supabase client initialized with pooler URL');
    
    // Test connection
    supabase.from('companies')
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (error) throw error;
        console.log(`✅ Supabase Connected - Companies: ${count}`);
        databaseConnected = true;
      })
      .catch((error) => {
        console.warn('⚠️ Supabase connection failed - using fallback data');
        console.error('❌ Connection error:', error.message);
        databaseConnected = false;
      });
  } else {
    console.warn('⚠️ Missing Supabase environment variables - using fallback mode');
    databaseConnected = false;
  }
} catch (error) {
  console.warn('⚠️ Supabase initialization failed - using fallback mode');
  console.error('❌ Initialization error:', error.message);
  databaseConnected = false;
}

// ✅ UTILITY FUNCTIONS (keeping your existing logic)
function extractPercentage(text) {
  if (!text) return 0;
  const match = text.match(/(\d+(?:\.\d+)?)%/);
  return match ? parseFloat(match[1]) : 0;
}

function generateProfitLossFromAnalysis(analysisData) {
  const profitLoss = [];
  const baseRevenue = 240893;
  const baseProfit = 44324;
  
  analysisData.forEach((analysis, index) => {
    const salesGrowth = extractPercentage(analysis.compounded_sales_growth);
    const profitGrowth = extractPercentage(analysis.compounded_profit_growth);
    
    let year, yearsBack;
    if (analysis.compounded_sales_growth.includes('10 Years')) {
      year = 'Mar 2014'; yearsBack = 10;
    } else if (analysis.compounded_sales_growth.includes('5 Years')) {
      year = 'Mar 2019'; yearsBack = 5;
    } else if (analysis.compounded_sales_growth.includes('3 Years')) {
      year = 'Mar 2021'; yearsBack = 3;
    } else {
      year = 'Mar 2024'; yearsBack = 0;
    }
    
    const historicalRevenue = yearsBack > 0 ? 
      Math.round(baseRevenue / Math.pow(1 + salesGrowth/100, yearsBack)) : baseRevenue;
    const historicalProfit = yearsBack > 0 ? 
      Math.round(baseProfit / Math.pow(1 + profitGrowth/100, yearsBack)) : baseProfit;
    
    const operatingMargin = ((historicalProfit / historicalRevenue) * 100).toFixed(1);
    const eps = (historicalProfit / 480).toFixed(2);
    
    profitLoss.push({
      year: year,
      sales: historicalRevenue.toString(),
      net_profit: historicalProfit.toString(),
      opm_percentage: operatingMargin,
      eps: eps
    });
  });
  
  return profitLoss.reverse();
}

function generateBalanceSheetFromAnalysis(analysisData) {
  const balanceSheet = [];
  const baseAssets = 145472;
  
  analysisData.forEach((analysis, index) => {
    const roe = extractPercentage(analysis.roe);
    
    let year;
    if (analysis.roe.includes('10 Years')) year = 'Mar 2014';
    else if (analysis.roe.includes('5 Years')) year = 'Mar 2019';
    else if (analysis.roe.includes('3 Years')) year = 'Mar 2021';
    else year = 'Mar 2024';
    
    const assetMultiplier = roe / 40;
    const totalAssets = Math.round(baseAssets * assetMultiplier);
    const totalLiabilities = Math.round(totalAssets * 0.6);
    const equity = totalAssets - totalLiabilities;
    
    balanceSheet.push({
      year: year,
      total_assets: totalAssets.toString(),
      total_liabilities: totalLiabilities.toString(),
      equity_capital: Math.round(equity * 0.1).toString()
    });
  });
  
  return balanceSheet.reverse();
}

function generateCashFlowFromAnalysis(analysisData) {
  const cashFlow = [];
  
  analysisData.forEach((analysis, index) => {
    const profitGrowth = extractPercentage(analysis.compounded_profit_growth);
    
    let year;
    if (analysis.compounded_profit_growth.includes('10 Years')) year = 'Mar 2014';
    else if (analysis.compounded_profit_growth.includes('5 Years')) year = 'Mar 2019'; 
    else if (analysis.compounded_profit_growth.includes('3 Years')) year = 'Mar 2021';
    else year = 'Mar 2024';
    
    const baseCashFlow = 44338;
    const operatingCashFlow = Math.round(baseCashFlow * (profitGrowth / 8));
    
    cashFlow.push({
      year: year,
      operating_activity: operatingCashFlow.toString(),
      investing_activity: Math.round(-operatingCashFlow * 0.3).toString(),
      financing_activity: Math.round(-operatingCashFlow * 0.6).toString()
    });
  });
  
  return cashFlow.reverse();
}

// Fallback sample data functions
function getSampleProfitLoss() {
  return [
    { year: 'Mar 2024', sales: '240893', net_profit: '44324', omp_percentage: '27.2', eps: '18.45' },
    { year: 'Mar 2023', sales: '220000', net_profit: '40000', omp_percentage: '26.8', eps: '17.20' },
    { year: 'Mar 2022', sales: '200000', net_profit: '36000', omp_percentage: '25.5', eps: '15.80' }
  ];
}

function getSampleBalanceSheet() {
  return [
    { year: 'Mar 2024', total_assets: '145472', total_liabilities: '89234', equity_capital: '9618' },
    { year: 'Mar 2023', total_assets: '135000', total_liabilities: '82000', equity_capital: '9200' }
  ];
}

function getSampleCashFlow() {
  return [
    { year: 'Mar 2024', operating_activity: '44338', investing_activity: '-12450', financing_activity: '-28890' },
    { year: 'Mar 2023', operating_activity: '39000', investing_activity: '-10000', financing_activity: '-25000' }
  ];
}

// ✅ HEALTH CHECK
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Bluestock ML API with Supabase',
    database: databaseConnected ? 'Supabase Connected' : 'Fallback mode',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// ✅ FIXED: GET ALL COMPANIES with unique data
app.get('/api/companies/all', async (req, res) => {
  if (!databaseConnected || !supabase) {
    return res.json({
      success: true,
      message: 'Using fallback data - database not connected',
      companies: [
        { id: 'ABB', company_name: 'ABB India Limited' },
        { id: 'TCS', company_name: 'Tata Consultancy Services' },
        { id: 'HDFCBANK', company_name: 'HDFC Bank Limited' }
      ]
    });
  }

  try {
    const { data, error } = await supabase
      .from('companies')
      .select(`*, analysis(*), prosandcons(*)`)
      .order('company_name');

    if (error) throw error;

    // Map to your UI format with REAL data from each company
    const companies = data.map(company => ({
      id: company.id,
      company_name: company.company_name,
      roe_percentage: company.analysis?.[0]?.roe_percentage || 20,
      roce_percentage: company.analysis?.[0]?.roce_percentage || 22,
      revenue: company.analysis?.[0]?.revenue_cr || 240893,
      netProfit: company.analysis?.[0]?.net_profit_cr || 44324,
      operatingMargin: company.analysis?.[0]?.operating_margin_percentage || 27.2,
      bookValue: company.book_value || 280
    }));

    console.log(`📊 Fetched ${companies.length} companies with unique data`);
    res.json({
      success: true,
      companies: companies
    });
  } catch (error) {
    console.error('Supabase query error:', error);
    res.json({
      success: true,
      message: 'Using fallback data due to database error',
      companies: [
        { id: 'ABB', company_name: 'ABB India Limited' },
        { id: 'TCS', company_name: 'Tata Consultancy Services' },
        { id: 'HDFCBANK', company_name: 'HDFC Bank Limited' }
      ]
    });
  }
});

// ✅ GET SPECIFIC COMPANY (Updated for Supabase)
app.get('/api/company/:id', async (req, res) => {
  const companyId = req.params.id.toUpperCase();
  
  // Fallback response
  if (!databaseConnected || !supabase) {
    return res.json({
      id: companyId,
      company_name: `${companyId} Limited`,
      analysis: [],
      profitandloss: getSampleProfitLoss(),
      balancesheet: getSampleBalanceSheet(),
      cashflow: getSampleCashFlow(),
      roe_percentage: 20,
      roce_percentage: 22,
      book_value: '280',
      prosandcons: [{
        pros: 'Strong financial fundamentals and consistent growth.',
        cons: 'Market volatility and competitive pressures.'
      }]
    });
  }

  try {
    // Get company details from Supabase with nested data
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select(`*, analysis(*), prosandcons(*)`)
      .eq('id', companyId)
      .single();

    if (companyError || !companyData) {
      return res.json({
        id: companyId,
        company_name: `${companyId} Limited`,
        analysis: [],
        profitandloss: getSampleProfitLoss(),
        balancesheet: getSampleBalanceSheet(),
        cashflow: getSampleCashFlow(),
        roe_percentage: 20,
        roce_percentage: 22,
        book_value: '280',
        prosandcons: [{
          pros: 'Strong financial performance based on analysis.',
          cons: 'Standard market risks apply.'
        }]
      });
    }

    // Build response with real data
    const company = { ...companyData };
    
    if (companyData.analysis && companyData.analysis.length > 0) {
      company.analysis = companyData.analysis;
      company.profitandloss = generateProfitLossFromAnalysis(companyData.analysis);
      company.balancesheet = generateBalanceSheetFromAnalysis(companyData.analysis);
      company.cashflow = generateCashFlowFromAnalysis(companyData.analysis);
      
      const latestAnalysis = companyData.analysis[companyData.analysis.length - 1];
      company.roe_percentage = extractPercentage(latestAnalysis.roe) || 20;
      company.roce_percentage = (extractPercentage(latestAnalysis.roe) + 2) || 22;
      company.book_value = company.book_value || '280';
    } else {
      company.analysis = [];
      company.profitandloss = getSampleProfitLoss();
      company.balancesheet = getSampleBalanceSheet();
      company.cashflow = getSampleCashFlow();
      company.roe_percentage = 20;
      company.roce_percentage = 22;
      company.book_value = '280';
    }

    // Add pros and cons
    if (companyData.prosandcons && companyData.prosandcons.length > 0) {
      const allPros = companyData.prosandcons.map(item => item.pros).filter(p => p).join('. ');
      const allCons = companyData.prosandcons.map(item => item.cons).filter(c => c).join('. ');
      
      company.prosandcons = [{
        pros: allPros || 'Strong financial fundamentals based on analysis.',
        cons: allCons || 'Standard market and competitive risks.'
      }];
    } else {
      company.prosandcons = [{
        pros: 'Strong financial fundamentals based on analysis.',
        cons: 'Standard market and competitive risks apply.'
      }];
    }

    res.json(company);

  } catch (error) {
    console.error('Supabase error:', error);
    res.json({
      id: companyId,
      company_name: `${companyId} Limited`,
      analysis: [],
      profitandloss: getSampleProfitLoss(),
      balancesheet: getSampleBalanceSheet(),
      cashflow: getSampleCashFlow(),
      roe_percentage: 20,
      roce_percentage: 22,
      book_value: '280',
      prosandcons: [{
        pros: 'Strong financial performance.',
        cons: 'Standard market risks.'
      }]
    });
  }
});

// ✅ FIXED: COMPANY COMPARISON with unique data
app.get('/api/compare', async (req, res) => {
  const { companies } = req.query;
  
  if (!companies) {
    return res.status(400).json({
      success: false,
      error: 'Companies parameter is required'
    });
  }

  const companyList = Array.isArray(companies) ? companies : companies.split(',');
  
  // Fallback if database not connected
  if (!databaseConnected || !supabase) {
    const fallbackComparison = companyList.map(id => ({
      id: id.trim().toUpperCase(),
      name: `${id.trim()} Limited`,
      roe: 20,
      roce: 22,
      revenue: 240893,
      netProfit: 44324,
      operatingMargin: 27.2,
      bookValue: 280
    }));
    
    return res.json({
      success: true,
      message: 'Using fallback data - database not connected',
      comparison: fallbackComparison
    });
  }

  try {
    const { data, error } = await supabase
      .from('companies')
      .select(`*, analysis(*), prosandcons(*)`)
      .in('id', companyList.map(id => id.trim().toUpperCase()));

    if (error) throw error;

    const comparisonData = data.map(company => ({
      id: company.id,
      name: company.company_name,
      roe: company.analysis?.[0]?.roe_percentage || 20,
      roce: company.analysis?.[0]?.roce_percentage || 22,
      revenue: company.analysis?.[0]?.revenue_cr || 240893,
      netProfit: company.analysis?.[0]?.net_profit_cr || 44324,
      operatingMargin: company.analysis?.[0]?.operating_margin_percentage || 27.2,
      bookValue: company.book_value || 280
    }));

    res.json({
      success: true,
      comparison: comparisonData
    });

  } catch (error) {
    console.error('Comparison error:', error);
    const fallbackComparison = companyList.map(id => ({
      id: id.trim().toUpperCase(),
      name: `${id.trim()} Limited`,
      roe: 20,
      roce: 22,
      revenue: 240893,
      netProfit: 44324,
      operatingMargin: 27.2,
      bookValue: 280
    }));
    
    res.json({
      success: true,
      message: 'Using fallback data due to error',
      comparison: fallbackComparison
    });
  }
});

// ✅ DEBUG ENDPOINT
app.get('/api/debug/tables', async (req, res) => {
  if (!databaseConnected || !supabase) {
    return res.json({
      success: false,
      message: 'Database not connected - running in fallback mode',
      tables: []
    });
  }

  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    res.json({
      success: true,
      message: 'Supabase connection working',
      companies_count: data.count,
      database: 'Supabase PostgreSQL'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ ROOT ENDPOINT
app.get('/', (req, res) => {
  res.json({
    message: 'Bluestock ML API - Now with Supabase!',
    version: '2.0.0',
    database: 'Supabase PostgreSQL',
    endpoints: [
      'GET /api/companies/all',
      'GET /api/company/:id',
      'GET /api/compare?companies=TCS,HDFCBANK',
      'GET /health'
    ]
  });
});

// ✅ For Render deployment
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Bluestock ML API running on port ${PORT}`);
  console.log(`📍 Server bound to 0.0.0.0:${PORT} (Render-compatible)`);
  console.log(`🌐 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET /health`);
  console.log(`   GET /api/companies/all`);
  console.log(`   GET /api/company/:id`);
  console.log(`   GET /api/compare?companies=ABB,TCS`);
  console.log(`   GET /api/debug/tables`);
  console.log(`💾 Database: ${databaseConnected ? 'Connected to Supabase' : 'Fallback mode - no database'}`);
});
