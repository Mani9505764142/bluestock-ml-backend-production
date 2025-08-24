// Server.js - Updated with custom DNS resolver for Supabase
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const dns = require('dns');
const https = require('https');

// Custom DNS resolver using Google and Cloudflare DNS
const customResolver = new dns.Resolver();
customResolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

// Custom lookup function for DNS resolution
const customLookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  console.log(`🔍 DNS Lookup for: ${hostname}`);
  
  customResolver.resolve4(hostname, (err, addresses) => {
    if (err) {
      console.error(`❌ DNS resolution failed for ${hostname}:`, err.message);
      // Fallback to default DNS
      return dns.lookup(hostname, options, callback);
    }
    
    console.log(`✅ DNS resolved ${hostname} to: ${addresses[0]}`);
    callback(null, addresses[0], 4);
  });
};

// Custom HTTPS agent with DNS override
const customAgent = new https.Agent({
  lookup: customLookup,
  keepAlive: true,
  maxSockets: 10
});

const app = express();

// ✅ Debug: Check if environment variables are loaded
console.log('🔍 Environment Variables Check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Loaded' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Loaded' : '❌ Missing');

// ✅ Use environment PORT for Render
const PORT = process.env.PORT || 3002;

// ✅ CORS configuration (keeping your existing setup)
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

// ✅ SUPABASE CONNECTION with Custom DNS Resolution
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase;
let databaseConnected = false;

try {
  if (supabaseUrl && supabaseKey) {
    // Create Supabase client with custom DNS resolver
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        detectSessionInUrl: false
      },
      realtime: {
        enabled: false
      },
      global: {
        headers: {
          'user-agent': 'render-dns-resolver'
        },
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            agent: url.startsWith('https:') ? customAgent : undefined
          }).catch(error => {
            console.error('❌ Fetch error details:', {
              message: error.message,
              code: error.code,
              errno: error.errno,
              syscall: error.syscall,
              hostname: error.hostname
            });
            throw error;
          });
        }
      }
    });
    
    console.log('✅ Supabase client initialized with custom DNS resolver');
    
    // Test connection with enhanced error logging
    supabase.from('companies')
      .select('count(*)')
      .single()
      .then(({ data, error }) => {
        if (error) throw error;
        console.log(`✅ Supabase Connected - Companies: ${data.count}`);
        databaseConnected = true;
      })
      .catch((error) => {
        console.warn('⚠️ Supabase connection failed - using fallback data');
        console.error('❌ Full connection error:', {
          message: error.message,
          details: error.details || 'No additional details',
          hint: error.hint || 'No hint provided',
          code: error.code || 'No error code'
        });
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

// Fallback sample data functions (keeping your existing ones)
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

// ✅ GET ALL COMPANIES (Updated for Supabase)
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
      .select('*')
      .order('company_name');

    if (error) throw error;

    console.log(`📊 Fetched ${data.length} companies from Supabase`);
    res.json({
      success: true,
      companies: data
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
    // Get company details from Supabase
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('company_id', companyId)
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

    // Get analysis data
    const { data: analysisData, error: analysisError } = await supabase
      .from('analysis')
      .select('*')
      .eq('company_id', companyId)
      .order('id');

    // Get pros and cons
    const { data: prosConsData, error: prosConsError } = await supabase
      .from('prosandcons')
      .select('*')
      .eq('company_id', companyId);

    // Build response (keeping your exact structure)
    const company = { ...companyData };
    
    if (!analysisError && analysisData && analysisData.length > 0) {
      company.analysis = analysisData;
      company.profitandloss = generateProfitLossFromAnalysis(analysisData);
      company.balancesheet = generateBalanceSheetFromAnalysis(analysisData);
      company.cashflow = generateCashFlowFromAnalysis(analysisData);
      
      const latestAnalysis = analysisData[analysisData.length - 1];
      company.roe_percentage = extractPercentage(latestAnalysis.roe);
      company.roce_percentage = extractPercentage(latestAnalysis.roe) + 2;
      company.book_value = '280';
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
    if (!prosConsError && prosConsData && prosConsData.length > 0) {
      const allPros = prosConsData.map(item => item.pros).filter(p => p).join('. ');
      const allCons = prosConsData.map(item => item.cons).filter(c => c).join('. ');
      
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

// ✅ COMPANY COMPARISON (Updated for Supabase)
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
    const comparisonData = [];
    
    for (const companyId of companyList) {
      const upperCompanyId = companyId.trim().toUpperCase();
      
      // Get company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('company_id', upperCompanyId)
        .single();

      if (companyError || !companyData) {
        comparisonData.push({
          id: upperCompanyId,
          name: `${upperCompanyId} Limited`,
          roe: 20,
          roce: 22,
          revenue: 240893,
          netProfit: 44324,
          operatingMargin: 27.2,
          bookValue: 280
        });
        continue;
      }

      // Get analysis
      const { data: analysisData, error: analysisError } = await supabase
        .from('analysis')
        .select('*')
        .eq('company_id', upperCompanyId)
        .order('id');

      let revenue = 0, netProfit = 0, operatingMargin = 0;

      if (!analysisError && analysisData && analysisData.length > 0) {
        const profitLossData = generateProfitLossFromAnalysis(analysisData);
        
        if (profitLossData && profitLossData.length > 0) {
          const latest = profitLossData[profitLossData.length - 1];
          revenue = parseInt(latest.sales) || 0;
          netProfit = parseInt(latest.net_profit) || 0;
          operatingMargin = parseFloat(latest.omp_percentage) || 0;
        }

        const latestAnalysis = analysisData[analysisData.length - 1];
        companyData.roe_percentage = extractPercentage(latestAnalysis.roe);
        companyData.roce_percentage = extractPercentage(latestAnalysis.roe) + 2;
      } else {
        companyData.roe_percentage = 20;
        companyData.roce_percentage = 22;
        const fallbackData = getSampleProfitLoss();
        const latest = fallbackData[fallbackData.length - 1];
        revenue = parseInt(latest.sales) || 0;
        netProfit = parseInt(latest.net_profit) || 0;
        operatingMargin = parseFloat(latest.omp_percentage) || 0;
      }

      comparisonData.push({
        id: companyData.company_id || companyData.id,
        name: companyData.company_name || companyData.company_id,
        roe: companyData.roe_percentage || 0,
        roce: companyData.roce_percentage || 0,
        revenue: revenue,
        netProfit: netProfit,
        operatingMargin: operatingMargin,
        bookValue: 280
      });
    }

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
      .select('count(*)')
      .single();

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
