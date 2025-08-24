// api/companyService.js
import { supabase } from '../database/supabase.js';

export class CompanyService {
  
  // Get all companies (your 100 migrated companies)
  static async getAllCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('company_name');
      
      if (error) throw error;
      return { success: true, data, count: data.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get company with complete analysis
  static async getCompanyProfile(companyId) {
    try {
      // Get company details
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (companyError) throw companyError;

      // Get financial analysis (your 4 time periods)
      const { data: analysis, error: analysisError } = await supabase
        .from('analysis')
        .select('*')
        .eq('company_id', companyId)
        .order('id');

      // Get pros and cons
      const { data: prosAndCons, error: prosConsError } = await supabase
        .from('prosandcons')
        .select('*')
        .eq('company_id', companyId);

      return {
        success: true,
        data: {
          company,
          analysis: analysis || [],
          prosAndCons: prosAndCons || []
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ML-ready data format
  static async getMLAnalysisData(companyId) {
    try {
      const { data, error } = await supabase
        .from('analysis')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;

      // Format for ML processing
      const mlData = data.map(record => ({
        period: record.compounded_sales_growth.split(':')[0],
        salesGrowth: parseFloat(record.compounded_sales_growth.match(/\d+/)[0]),
        profitGrowth: parseFloat(record.compounded_profit_growth.match(/\d+/)[0]),
        stockCAGR: parseFloat(record.stock_price_cagr.match(/-?\d+/)[0]),
        roe: parseFloat(record.roe.match(/\d+/)[0])
      }));

      return { success: true, data: mlData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
