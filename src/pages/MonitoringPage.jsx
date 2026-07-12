import LiveTrendChart from "../components/LiveTrendChart";
import SensorCard from "../components/SensorCard";

function MonitoringPage({ chartData, chartSeries, gasSeries, particulateSeries, riskSeries, sensorCards }) {
  return (
    <>
      <section className="mb-4">
        <div className="row g-3">
          {sensorCards.slice(6).map((card) => (
            <SensorCard key={card.title} title={card.title} value={card.value} unit={card.unit} subtitle={card.subtitle} icon={card.icon} tone={card.tone} />
          ))}
        </div>
      </section>

      <section className="row g-4 mb-4">
        <div className="col-12 col-xl-6">
          <LiveTrendChart title="Temperature and humidity" subtitle="Latest 50 readings" data={chartData.slice(-50)} series={chartSeries} />
        </div>
        <div className="col-12 col-xl-6">
          <LiveTrendChart title="Gas and oxygen indicators" subtitle="Academic estimates from the sensor platform" data={chartData.slice(-50)} series={gasSeries} />
        </div>
        <div className="col-12 col-xl-6">
          <LiveTrendChart title="Particulate matter" subtitle="PM2.5 and PM10 exposure indicators" data={chartData.slice(-50)} series={particulateSeries} />
        </div>
        <div className="col-12 col-xl-6">
          <LiveTrendChart title="Contamination risk" subtitle="Derived risk indicator" data={chartData.slice(-50)} series={riskSeries} />
        </div>
      </section>
    </>
  );
}

export default MonitoringPage;
