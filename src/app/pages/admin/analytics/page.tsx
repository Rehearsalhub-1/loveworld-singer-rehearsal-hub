"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Eye,
  MousePointer,
  Clock,
  TrendingUp,
  Download,
  Calendar,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { getAnalyticsData } from '@/utils/analytics';
import { ScreenHeader } from '@/components/ScreenHeader';

interface AnalyticsData {
  totalVisits: number;
  uniqueVisitors: number;
  pageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ page: string; views: number }>;
  deviceTypes: Array<{ type: string; count: number; percentage: number }>;
  browserStats: Array<{ browser: string; count: number; percentage: number }>;
  dailyVisits: Array<{ date: string; visits: number; uniqueVisitors: number }>;
  hourlyVisits: Array<{ hour: number; visits: number }>;
  referrers: Array<{ source: string; count: number; percentage: number }>;
  countries: Array<{ country: string; count: number; percentage: number }>;
}

const AnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d, 1y
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch real analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);

      try {
        // Get real analytics data from Firebase
        const realData = await getAnalyticsData(dateRange);

        // If no real data, show empty state
        if (realData.totalVisits === 0) {
          setAnalyticsData(null);
        } else {
          setAnalyticsData(realData);
        }
      } catch (error) {
 console.error('Failed to fetch analytics data:', error);
        setAnalyticsData(null);
      }

      setLoading(false);
    };

    fetchAnalyticsData();
  }, [dateRange]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportAllData = () => {
    if (!analyticsData) return;

    const allData = {
      overview: {
        totalVisits: analyticsData.totalVisits,
        uniqueVisitors: analyticsData.uniqueVisitors,
        pageViews: analyticsData.pageViews,
        averageSessionDuration: analyticsData.averageSessionDuration,
        bounceRate: analyticsData.bounceRate
      },
      topPages: analyticsData.topPages,
      deviceTypes: analyticsData.deviceTypes,
      browserStats: analyticsData.browserStats,
      dailyVisits: analyticsData.dailyVisits,
      hourlyVisits: analyticsData.hourlyVisits,
      referrers: analyticsData.referrers,
      countries: analyticsData.countries
    };

    const csvContent = Object.entries(allData).map(([section, data]) => {
      if (Array.isArray(data)) {
        return [
          `\n=== ${section.toUpperCase()} ===`,
          Object.keys(data[0] || {}).join(','),
          ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
        ].join('\n');
      } else {
        return [
          `\n=== ${section.toUpperCase()} ===`,
          Object.keys(data).join(','),
          Object.values(data).map(val => `"${val}"`).join(',')
        ].join('\n');
      }
    }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No Analytics Data</h2>
            <p className="text-gray-500">Analytics data will appear here once users start visiting the site.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <ScreenHeader
          title="Website Analytics"
          subtitle="Track website performance and user behavior"
          showBackButton={true}
          backPath="/admin"
          rightButtons={
            <div className="flex gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              <button
                onClick={exportAllData}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          }
        />
        <div className="mt-8" />

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Visits</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.totalVisits.toLocaleString()}</p>
                </div>
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-green-600 bg-green-100">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12.5%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Visitors</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.uniqueVisitors.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-green-600 bg-green-100">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8.2%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Page Views</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.pageViews.toLocaleString()}</p>
                </div>
                <MousePointer className="h-8 w-8 text-purple-600" />
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-green-600 bg-green-100">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +15.3%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Session</p>
                  <p className="text-2xl font-bold text-gray-900">{formatDuration(analyticsData.averageSessionDuration)}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-red-600 bg-red-100">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  -2.1%
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bounce Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.bounceRate}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pages per Session</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(analyticsData.pageViews / analyticsData.totalVisits).toFixed(1)}
                  </p>
                </div>
                <PieChart className="h-8 w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pages">Top Pages</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
            <TabsTrigger value="time">Time Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Daily Visits (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData.dailyVisits.slice(-7).map((day, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium">{day.visits}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium">{day.uniqueVisitors}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportToCSV(analyticsData.dailyVisits, 'daily_visits')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Hourly Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analyticsData.hourlyVisits.slice(0, 12).map((hour, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {hour.hour.toString().padStart(2, '0')}:00
                        </span>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 bg-blue-500 rounded"
                            style={{ width: `${(hour.visits / Math.max(...analyticsData.hourlyVisits.map(h => h.visits))) * 100}%` }}
                          ></div>
                          <span className="text-sm font-medium w-12 text-right">{hour.visits}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportToCSV(analyticsData.hourlyVisits, 'hourly_visits')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Top Pages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.topPages.map((page, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <span className="font-medium">{page.page}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{page.views.toLocaleString()} views</span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${(page.views / analyticsData.topPages[0].views) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportToCSV(analyticsData.topPages, 'top_pages')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Device Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.deviceTypes.map((device, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {device.type === 'Desktop' && <Monitor className="h-5 w-5 text-blue-600" />}
                          {device.type === 'Mobile' && <Smartphone className="h-5 w-5 text-green-600" />}
                          {device.type === 'Tablet' && <Tablet className="h-5 w-5 text-purple-600" />}
                          <span className="font-medium">{device.type}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600">{device.percentage}%</span>
                          <span className="text-sm font-medium">{device.count.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportToCSV(analyticsData.deviceTypes, 'device_types')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Browser Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.browserStats.map((browser, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="font-medium">{browser.browser}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600">{browser.percentage}%</span>
                          <span className="text-sm font-medium">{browser.count.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportToCSV(analyticsData.browserStats, 'browser_stats')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="traffic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Traffic Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.referrers.map((referrer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{referrer.source}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{referrer.percentage}%</span>
                        <span className="text-sm font-medium">{referrer.count.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportToCSV(analyticsData.referrers, 'traffic_sources')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geography" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Geographic Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.countries.map((country, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{country.country}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{country.percentage}%</span>
                        <span className="text-sm font-medium">{country.count.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportToCSV(analyticsData.countries, 'geographic_distribution')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Daily Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData.dailyVisits.slice(-14).map((day, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">{day.visits}</span>
                          <span className="text-sm text-gray-500">({day.uniqueVisitors} unique)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportToCSV(analyticsData.dailyVisits, 'daily_trends')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Peak Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analyticsData.hourlyVisits
                      .sort((a, b) => b.visits - a.visits)
                      .slice(0, 10)
                      .map((hour, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {hour.hour.toString().padStart(2, '0')}:00
                          </span>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 bg-blue-500 rounded"
                              style={{ width: `${(hour.visits / Math.max(...analyticsData.hourlyVisits.map(h => h.visits))) * 100}%` }}
                            ></div>
                            <span className="text-sm font-medium w-12 text-right">{hour.visits}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportToCSV(analyticsData.hourlyVisits, 'peak_hours')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AnalyticsPage;
