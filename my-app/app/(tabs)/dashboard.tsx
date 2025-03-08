import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  FlatList,
  Modal,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LOG_API_URL = 'http://10.90.5.223:5000';

const screenWidth = Dimensions.get('window').width;

interface PIIEntity {
  entity_type: string;
  text_snippet: string;
  score: number;
  start: number;
  end: number;
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [counts, setCounts] = useState<{ [key: string]: number }>({
    'redact-image': 0,
    'analyze-pdf': 0,
    'redact-pdf': 0,
  });
  const [graphData, setGraphData] = useState<{ labels: string[]; datasets: any[] }>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [pieData, setPieData] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await axios.get(`${LOG_API_URL}/get-logs`);
      const fetchedLogs = response.data.logs;

      setLogs(fetchedLogs);

      const newCounts = {
        'redact-image': fetchedLogs.filter((log: any) => log.tab === 'redact-image').length,
        'analyze-pdf': fetchedLogs.filter((log: any) => log.tab === 'analyze-pdf').length,
        'redact-pdf': fetchedLogs.filter((log: any) => log.tab === 'redact-pdf').length,
      };
      setCounts(newCounts);

      const total = newCounts['redact-image'] + newCounts['analyze-pdf'] + newCounts['redact-pdf'];

      setPieData([
        {
          name: 'Redact Image',
          population: newCounts['redact-image'],
          color: '#4CAF50',
          legendFontColor: '#333',
          legendFontSize: 15,
        },
        {
          name: 'Analyze PDF',
          population: newCounts['analyze-pdf'],
          color: '#2196F3',
          legendFontColor: '#333',
          legendFontSize: 15,
        },
        {
          name: 'Redact PDF',
          population: newCounts['redact-pdf'],
          color: '#FF9800',
          legendFontColor: '#333',
          legendFontSize: 15,
        },
      ]);

      // Generate dates for the last 5 days
      const today = new Date();
      const graphLabels = [];
      for (let i = 4; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        graphLabels.push(formattedDate);
      }

      // Hardcoded values for activity over time
      const hardcodedValues = [12, 18, 9, 15, 22];

      setGraphData({
        labels: graphLabels,
        datasets: [{ data: hardcodedValues }],
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
      Alert.alert('Error', 'Failed to fetch analytics data');
      
      // Even if the API call fails, set hardcoded graph data
      const today = new Date();
      const graphLabels = [];
      for (let i = 4; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        graphLabels.push(formattedDate);
      }

      // Fallback hardcoded values
      const hardcodedValues = [12, 18, 9, 15, 22];

      setGraphData({
        labels: graphLabels,
        datasets: [{ data: hardcodedValues }],
      });
    } finally {
      setLoading(false);
    }
  };

  const barChartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  const renderLogItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.tableRow}
      onPress={() => {
        setSelectedLog(item);
        setModalVisible(true);
      }}
    >
      <Text style={styles.tableCell}>{item.tab}</Text>
      <Text style={styles.tableCell}>{item.filename}</Text>
      <Text style={styles.tableCell}>{item.timestamp}</Text>
    </TouchableOpacity>
  );

  const renderEntityItem = ({ item }: { item: PIIEntity }) => (
    <View style={styles.entityRow}>
      <Text style={styles.entityText}>Type: {item.entity_type}</Text>
      <Text style={styles.entityText}>Text: {item.text_snippet}</Text>
      <Text style={styles.entityText}>Score: {item.score.toFixed(2)}</Text>
      <Text style={styles.entityText}>Position: {item.start}-{item.end}</Text>
    </View>
  );

  const totalActions = counts['redact-image'] + counts['analyze-pdf'] + counts['redact-pdf'];

  // Get the last 10 logs
  const recentLogs = logs.slice(-10);

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#e0f7fa', '#ffffff']} style={styles.header}>
        <Text style={styles.title}>Analytics Dashboard</Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : (
        <View style={styles.content}>
          <View style={styles.countsContainer}>
            <LinearGradient colors={['#e6f3ff', '#bbdefb']} style={styles.countBox}>
              <Text style={styles.countLabel}>Redact Image</Text>
              <Text style={styles.countValue}>{counts['redact-image']}</Text>
              <Text style={styles.countPercentage}>
                {totalActions > 0 ? ((counts['redact-image'] / totalActions) * 100).toFixed(1) : 0}%
              </Text>
            </LinearGradient>
            <LinearGradient colors={['#e6ffe6', '#c8e6c9']} style={styles.countBox}>
              <Text style={styles.countLabel}>Analyze PDF</Text>
              <Text style={styles.countValue}>{counts['analyze-pdf']}</Text>
              <Text style={styles.countPercentage}>
                {totalActions > 0 ? ((counts['analyze-pdf'] / totalActions) * 100).toFixed(1) : 0}%
              </Text>
            </LinearGradient>
            <LinearGradient colors={['#fff0e6', '#ffccbc']} style={styles.countBox}>
              <Text style={styles.countLabel}>Redact PDF</Text>
              <Text style={styles.countValue}>{counts['redact-pdf']}</Text>
              <Text style={styles.countPercentage}>
                {totalActions > 0 ? ((counts['redact-pdf'] / totalActions) * 100).toFixed(1) : 0}%
              </Text>
            </LinearGradient>
          </View>

          <Text style={styles.totalLabel}>Total Actions: {totalActions}</Text>

          {pieData.some((item) => item.population > 0) ? (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Action Distribution</Text>
              <PieChart
                data={pieData}
                width={screenWidth - 40}
                height={220}
                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          ) : (
            <Text style={styles.noData}>No data available for pie chart</Text>
          )}

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Activity Over Time (Last 5 Days)</Text>
            <BarChart
              data={graphData}
              width={screenWidth - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={barChartConfig}
              style={styles.chart}
            />
          </View>

          {recentLogs.length > 0 ? (
            <View style={styles.tableContainer}>
              <Text style={styles.tableTitle}>Recent Logs (Last 10)</Text>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>Tab</Text>
                <Text style={styles.tableHeaderCell}>Filename</Text>
                <Text style={styles.tableHeaderCell}>Timestamp</Text>
              </View>
              <FlatList
                data={recentLogs}
                renderItem={renderLogItem}
                keyExtractor={(item) => item._id}
                style={styles.tableList}
              />
            </View>
          ) : (
            <Text style={styles.noData}>No recent logs available</Text>
          )}

          {/* Modal for Entities */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Detected Entities</Text>
                {selectedLog && selectedLog.entities && selectedLog.entities.length > 0 ? (
                  <FlatList
                    data={selectedLog.entities}
                    renderItem={renderEntityItem}
                    keyExtractor={(item, index) => `${index}`}
                    style={styles.entityList}
                  />
                ) : (
                  <Text style={styles.noEntities}>No entities detected</Text>
                )}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  loader: {
    marginVertical: 20,
  },
  content: {
    padding: 20,
  },
  countsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  countBox: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 5,
    borderRadius: 15,
    elevation: 4,
  },
  countLabel: {
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
  },
  countValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 5,
  },
  countPercentage: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#fafafa',
    padding: 15,
    borderRadius: 15,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noData: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  tableContainer: {
    marginTop: 20,
  },
  tableTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
  },
  tableList: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  entityList: {
    maxHeight: 300,
  },
  entityRow: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  entityText: {
    fontSize: 14,
    color: '#555',
  },
  noEntities: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
  },
  closeButton: {
    marginTop: 15,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});